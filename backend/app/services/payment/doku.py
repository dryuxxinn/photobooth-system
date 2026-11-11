import base64
import hashlib
import hmac
import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from backend.app.core.config import PROJECT_ROOT, settings

logger = logging.getLogger("uvicorn.error")


class DokuPaymentService:
    """
    Production-ready DOKU Payment Gateway integration service (No Simulation Fallback).
    Supports:
    1. DOKU Checkout v1 (/checkout/v1/payment) + Direct EMVCo QRIS extraction
       (/checkout/v1/payment/{token_id}/generate-qris -> returns real 000201010212... QRIS string & NMID)
    2. DOKU Direct QRIS Status Inquiry (/checkout/v1/payment/{token_id}/qris-status)
       and DOKU Order Status Inquiry (/orders/v1/status/{invoice_number})
    3. DOKU Direct QRIS MPM (/qris-merchant-presentation/v2/generate-qr-code)
    4. Multi-format DOKU Webhook Notification parsing & verification
    """

    def __init__(self):
        self._refresh_config()

    def _refresh_config(self) -> None:
        """Reload DOKU credentials from environment / .env file."""
        env_file = PROJECT_ROOT / ".env"
        if env_file.is_file():
            for line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
                stripped = line.strip()
                if not stripped or stripped.startswith("#") or "=" not in stripped:
                    continue
                k, _, v = stripped.partition("=")
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k.startswith("DOKU_") and v:
                    os.environ[k] = v

        self.client_id = (os.getenv("DOKU_CLIENT_ID") or settings.DOKU_CLIENT_ID or "").strip()
        self.secret_key = (os.getenv("DOKU_SECRET_KEY") or settings.DOKU_SECRET_KEY or "").strip()
        self.shared_key = (os.getenv("DOKU_SHARED_KEY") or settings.DOKU_SHARED_KEY or "").strip()
        self.merchant_id = (os.getenv("DOKU_MERCHANT_ID") or settings.DOKU_MERCHANT_ID or "").strip()
        is_prod_env = os.getenv("DOKU_IS_PRODUCTION")
        if is_prod_env is not None:
            self.is_production = is_prod_env.strip().lower() in ("true", "1", "yes")
        else:
            self.is_production = settings.DOKU_IS_PRODUCTION
        self.merchant_name = os.getenv("DOKU_MERCHANT_NAME") or settings.DOKU_MERCHANT_NAME
        try:
            self.expiry_minutes = int(
                os.getenv("DOKU_QRIS_EXPIRY_MINUTES") or settings.DOKU_QRIS_EXPIRY_MINUTES or 5
            )
        except ValueError:
            self.expiry_minutes = 5

    @property
    def base_url(self) -> str:
        if self.is_production:
            return "https://api.doku.com"
        return "https://api-sandbox.doku.com"

    @property
    def checkout_base_url(self) -> str:
        if self.is_production:
            return "https://checkout.doku.com"
        return "https://checkout-sandbox.doku.com"

    @property
    def is_configured(self) -> bool:
        self._refresh_config()
        return bool(self.client_id and self.secret_key)

    def _generate_digest(self, body_bytes: bytes) -> str:
        """Calculate Base64-encoded SHA-256 hash of the request body."""
        hasher = hashlib.sha256()
        hasher.update(body_bytes)
        return base64.b64encode(hasher.digest()).decode("utf-8")

    def _generate_signature(
        self,
        request_id: str,
        timestamp: str,
        target_path: str,
        digest: Optional[str] = None,
    ) -> str:
        """
        Generate DOKU Non-SNAP HMAC-SHA256 signature header.
        """
        component = (
            f"Client-Id:{self.client_id}\n"
            f"Request-Id:{request_id}\n"
            f"Request-Timestamp:{timestamp}\n"
            f"Request-Target:{target_path}"
        )
        if digest is not None:
            component += f"\nDigest:{digest}"

        mac = hmac.new(
            self.secret_key.encode("utf-8"),
            component.encode("utf-8"),
            hashlib.sha256,
        )
        signature_b64 = base64.b64encode(mac.digest()).decode("utf-8")
        return f"HMACSHA256={signature_b64}"

    def verify_webhook_signature(
        self,
        headers: Dict[str, str],
        body_bytes: bytes,
        target_path: str = "/payment/doku/notify",
    ) -> Tuple[bool, str]:
        """
        Verify incoming DOKU notification signature across multiple DOKU notification formats.
        """
        self._refresh_config()
        if not (self.client_id and self.secret_key):
            return False, "DOKU credentials not configured on server."

        norm_headers = {k.lower(): v for k, v in headers.items()}
        signature = norm_headers.get("signature")

        if not signature:
            return True, "No Jokul Signature header present (Dashboard ping / QRIS V2 / SNAP mode)."

        request_id = norm_headers.get("request-id", "")
        timestamp = norm_headers.get("request-timestamp", "")
        digest = self._generate_digest(body_bytes)

        candidate_paths = [
            target_path,
            target_path.rstrip("/"),
            "/payment/doku/notify",
            "/session/payment/doku/notify",
            "/api/v1/payment/doku/notify",
        ]

        for path_option in dict.fromkeys(candidate_paths):
            expected_sig = self._generate_signature(request_id, timestamp, path_option, digest)
            if hmac.compare_digest(signature, expected_sig):
                return True, f"Valid signature (matched path: {path_option})"

        logger.warning(f"DOKU signature mismatch on path {target_path}. Received: {signature}.")
        return False, "Signature mismatch"

    def parse_notification(
        self,
        body_bytes: bytes,
        query_params: Dict[str, Any],
        headers: Dict[str, str],
    ) -> Dict[str, Any]:
        """
        Parse incoming DOKU webhook payload from any of DOKU's notification formats:
        1. JSON body (Jokul / Checkout / SNAP BI / QRIS V2 JSON)
        2. Form URL-Encoded body (Notify QRIS V2)
        3. URL Query Parameters (Notify QRIS V2 query params)
        """
        raw_data: Dict[str, Any] = {}
        if query_params:
            raw_data.update(query_params)

        body_str = body_bytes.decode("utf-8", errors="replace").strip() if body_bytes else ""

        if body_str:
            if body_str.startswith("{") or body_str.startswith("["):
                try:
                    parsed_json = json.loads(body_str)
                    if isinstance(parsed_json, dict):
                        raw_data.update(parsed_json)
                except Exception:
                    pass
            if "=" in body_str and not body_str.startswith("{"):
                try:
                    parsed_qs = urllib.parse.parse_qs(body_str, keep_blank_values=True)
                    for k, v in parsed_qs.items():
                        raw_data[k] = v[0] if len(v) == 1 else v
                except Exception:
                    pass

        if not raw_data:
            return {
                "invoice_number": None,
                "transaction_id": None,
                "status": "TEST_PING",
                "amount": None,
                "raw_data": {},
            }

        order_obj = raw_data.get("order") if isinstance(raw_data.get("order"), dict) else {}
        trx_obj = raw_data.get("transaction") if isinstance(raw_data.get("transaction"), dict) else {}
        additional_info = raw_data.get("additionalInfo") if isinstance(raw_data.get("additionalInfo"), dict) else {}

        invoice_number = (
            order_obj.get("invoice_number")
            or trx_obj.get("invoice_number")
            or raw_data.get("invoice_number")
            or raw_data.get("INVOICE")
            or raw_data.get("TRANSACTIONID")
            or raw_data.get("originalPartnerReferenceNo")
            or raw_data.get("partnerReferenceNo")
            or additional_info.get("invoice_number")
            or raw_data.get("transactionId")
            or raw_data.get("REFERENCEID")
        )

        doku_trx_id = (
            raw_data.get("transactionId")
            or raw_data.get("TRANSACTIONID")
            or raw_data.get("originalReferenceNo")
            or trx_obj.get("id")
            or invoice_number
            or "DK0000001"
        )

        jokul_status = str(trx_obj.get("status") or raw_data.get("status") or "").upper()
        qris_v2_status = str(raw_data.get("TXNSTATUS") or "").upper()
        activity_code = str(raw_data.get("activityCode") or "")
        message_str = str(raw_data.get("message") or "").upper()
        snap_status = str(raw_data.get("latestTransactionStatus") or "")
        snap_desc = str(raw_data.get("transactionStatusDesc") or "").upper()

        normalized_status = "PENDING"
        if (
            jokul_status in ("SUCCESS", "PAID", "SETTLED")
            or qris_v2_status in ("S", "SUCCESS", "PAID")
            or activity_code == "200"
            or "SUCCESS" in message_str
            or snap_status == "00"
            or snap_desc == "SUCCESS"
        ):
            normalized_status = "PAID"
        elif (
            jokul_status in ("FAILED", "EXPIRED", "CANCELLED", "VOID")
            or qris_v2_status in ("F", "FAILED", "EXPIRED")
            or "FAILED" in message_str
            or snap_status in ("05", "06")
        ):
            normalized_status = "FAILED"
        elif not invoice_number:
            normalized_status = "TEST_PING"

        raw_amount = (
            order_obj.get("amount")
            or raw_data.get("AMOUNT")
            or (
                raw_data.get("amount", {}).get("value")
                if isinstance(raw_data.get("amount"), dict)
                else raw_data.get("amount")
            )
        )
        parsed_amount: Optional[int] = None
        if raw_amount is not None:
            try:
                parsed_amount = int(float(str(raw_amount)))
            except Exception:
                parsed_amount = None

        return {
            "invoice_number": str(invoice_number) if invoice_number else None,
            "transaction_id": str(doku_trx_id)[:16] if doku_trx_id else "DK0000001",
            "status": normalized_status,
            "amount": parsed_amount,
            "raw_data": raw_data,
        }

    def _call_doku_post(self, target_path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send an authenticated POST request to DOKU Non-SNAP API with HMAC-SHA256 headers."""
        now_dt = datetime.now(timezone.utc)
        timestamp = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        request_id = str(uuid.uuid4())

        body_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        digest = self._generate_digest(body_bytes)
        signature = self._generate_signature(request_id, timestamp, target_path, digest)

        url = f"{self.base_url}{target_path}"
        req = urllib.request.Request(
            url,
            data=body_bytes,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Client-Id": self.client_id,
                "Request-Id": request_id,
                "Request-Timestamp": timestamp,
                "Signature": signature,
            },
            method="POST",
        )

        logger.info(f"Calling DOKU API: POST {url}")
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body)

    def _call_doku_get(self, target_path: str) -> Dict[str, Any]:
        """Send an authenticated GET request to DOKU Non-SNAP API (Order Status Inquiry)."""
        now_dt = datetime.now(timezone.utc)
        timestamp = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        request_id = str(uuid.uuid4())
        signature = self._generate_signature(request_id, timestamp, target_path, digest=None)

        url = f"{self.base_url}{target_path}"
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "Client-Id": self.client_id,
                "Request-Id": request_id,
                "Request-Timestamp": timestamp,
                "Signature": signature,
            },
            method="GET",
        )

        logger.info(f"Calling DOKU Status API: GET {url}")
        with urllib.request.urlopen(req, timeout=12) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body)

    def _exchange_checkout_token_for_qris(self, token_id: str) -> Dict[str, Any]:
        """
        Exchange a DOKU Checkout v2 token_id for the actual EMVCo QRIS string (000201010212...),
        NMID, systrace, and access_token via DOKU Checkout's generate-qris endpoint.
        """
        url = f"{self.checkout_base_url}/checkout/v1/payment/{urllib.parse.quote(token_id)}/generate-qris"
        body_bytes = json.dumps({"token_id": token_id}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body_bytes,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0",
            },
            method="POST",
        )
        logger.info(f"Exchanging DOKU Checkout token for EMVCo QRIS: POST {url}")
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body)

    def check_transaction_status(
        self,
        invoice_number: str,
        record: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Actively verify real payment status directly from DOKU server:
        1. Checks DOKU Checkout QRIS Status (/checkout/v1/payment/{token_id}/qris-status) if token metadata is present.
        2. Checks DOKU Order Status API (/orders/v1/status/{invoice_number}).
        """
        if not self.is_configured:
            return {"status": "PENDING", "message": "DOKU credentials not configured"}

        # 1. Check DOKU Checkout QRIS direct status if token_id, systrace, and access_token exist
        if record:
            token_id = record.get("_doku_token_id")
            systrace = record.get("_doku_systrace")
            access_token = record.get("_doku_access_token")
            if token_id and systrace and access_token:
                qris_status_url = (
                    f"{self.checkout_base_url}/checkout/v1/payment/{urllib.parse.quote(str(token_id))}/qris-status"
                )
                payload = {
                    "tokenId": str(token_id),
                    "systrace": systrace,
                    "accessToken": str(access_token),
                    "lang": "id",
                }
                req = urllib.request.Request(
                    qris_status_url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "User-Agent": "Mozilla/5.0",
                    },
                    method="POST",
                )
                try:
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        q_data = json.loads(resp.read().decode("utf-8"))
                        q_status = str(q_data.get("status") or "").upper()
                        if q_status in ("SUCCESS", "PAID", "SETTLED", "SUCCESS_CHECK_STATUS_PAYMENT_QRIS"):
                            logger.info(f"DOKU QRIS status confirmed PAID for {invoice_number}")
                            return {"status": "PAID", "raw_data": q_data}
                        if q_status in ("FAILED", "EXPIRED"):
                            return {"status": "FAILED", "raw_data": q_data}
                except urllib.error.HTTPError as e:
                    # HTTP 400 {"message":["Transaksi belum terbayar"]} is normal while waiting for scan
                    pass
                except Exception as e:
                    logger.debug(f"DOKU Checkout qris-status check error: {e}")

        # 2. Check DOKU Order Status Inquiry API (/orders/v1/status/{invoice_number})
        target_path = f"/orders/v1/status/{urllib.parse.quote(invoice_number)}"
        try:
            data = self._call_doku_get(target_path)
            trx_obj = data.get("transaction") if isinstance(data.get("transaction"), dict) else {}
            tx_status = str(trx_obj.get("status") or data.get("status") or "").upper()
            if tx_status in ("SUCCESS", "PAID", "SETTLED"):
                logger.info(f"DOKU Order Status confirmed PAID for {invoice_number}")
                return {"status": "PAID", "raw_data": data}
            if tx_status in ("FAILED", "EXPIRED", "CANCELLED", "VOID"):
                return {"status": "FAILED", "raw_data": data}
            return {"status": "PENDING", "raw_data": data}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            logger.debug(f"DOKU status check for {invoice_number} returned HTTP {e.code}: {err_body}")
            return {"status": "PENDING", "error": f"HTTP {e.code}"}
        except Exception as e:
            logger.debug(f"DOKU status check for {invoice_number} failed: {e}")
            return {"status": "PENDING", "error": str(e)}

    def generate_qris(
        self,
        amount: int,
        invoice_number: Optional[str] = None,
        package_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a real Dynamic EMVCo QRIS payment via DOKU Production/Sandbox API.
        Extracts the pure EMVCo QRIS string (000201010212...) so mobile banking / e-wallet apps
        can scan the QR directly on the kiosk screen.
        """
        if not self.is_configured:
            raise RuntimeError(
                "Kredensial DOKU (DOKU_CLIENT_ID dan DOKU_SECRET_KEY) belum diatur di file .env server."
            )

        now_dt = datetime.now(timezone.utc)
        timestamp = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        if not invoice_number:
            invoice_number = f"INV-{now_dt.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

        expiry_dt = now_dt + timedelta(minutes=self.expiry_minutes)
        expiry_iso = expiry_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        errors: list[str] = []

        # 1. Primary: DOKU Checkout v1 (/checkout/v1/payment) + Direct EMVCo QRIS extraction
        try:
            checkout_payload = {
                "order": {
                    "amount": amount,
                    "invoice_number": invoice_number,
                    "currency": "IDR",
                    "line_items": [
                        {
                            "name": package_name or self.merchant_name,
                            "price": amount,
                            "quantity": 1,
                        }
                    ],
                },
                "payment": {
                    "payment_due_date": self.expiry_minutes,
                    "payment_method_types": ["QRIS"],
                },
                "customer": {
                    "id": f"CUST-{invoice_number[-8:]}",
                    "name": "Pelanggan Photobooth",
                    "email": "customer@sweetstudio.id",
                },
            }
            data = self._call_doku_post("/checkout/v1/payment", checkout_payload)
            resp_inner = data.get("response") if isinstance(data.get("response"), dict) else data
            payment_obj = resp_inner.get("payment") if isinstance(resp_inner.get("payment"), dict) else {}
            payment_url = payment_obj.get("url") or ""
            token_id = payment_obj.get("token_id") or (
                payment_url.rstrip("/").split("/")[-1] if payment_url else ""
            )

            if token_id:
                qris_res = self._exchange_checkout_token_for_qris(token_id)
                qr_code_str = qris_res.get("qr_code")
                if qr_code_str and str(qr_code_str).startswith("000201"):
                    logger.info(
                        f"Generated real EMVCo Dynamic QRIS for invoice {invoice_number} "
                        f"(NMID: {qris_res.get('nmid')})"
                    )
                    return {
                        "provider": "DOKU",
                        "invoice_number": invoice_number,
                        "transaction_id": invoice_number,
                        "amount": amount,
                        "package_name": package_name or self.merchant_name,
                        "qr_string": qr_code_str,
                        "nmid": qris_res.get("nmid"),
                        "checkout_url": payment_url or None,
                        "status": "PENDING",
                        "expires_at": expiry_iso,
                        "created_at": timestamp,
                        "paid_at": None,
                        "_doku_token_id": token_id,
                        "_doku_systrace": qris_res.get("systrace"),
                        "_doku_access_token": qris_res.get("access_token"),
                    }
                errors.append(f"Token QRIS exchange did not return EMVCo qr_code: {qris_res}")
            else:
                errors.append(f"Checkout v1 missing token_id: {json.dumps(data)}")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            errors.append(f"Checkout QRIS HTTP {e.code}: {err_body}")
            logger.error(f"DOKU Checkout QRIS failed with HTTP {e.code}: {err_body}")
        except Exception as e:
            errors.append(f"Checkout QRIS Error: {e}")
            logger.error(f"DOKU Checkout QRIS failed: {e}")

        # 2. Secondary: DOKU Direct QRIS MPM (/qris-merchant-presentation/v2/generate-qr-code)
        try:
            qris_payload: Dict[str, Any] = {
                "order": {
                    "invoice_number": invoice_number,
                    "amount": amount,
                },
                "payment": {
                    "type": "SALE",
                },
            }
            if self.merchant_id:
                qris_payload["acquirer"] = {"id": self.merchant_id}

            data = self._call_doku_post(
                "/qris-merchant-presentation/v2/generate-qr-code",
                qris_payload,
            )
            qris_data = data.get("qris_data") if isinstance(data.get("qris_data"), dict) else {}
            qr_content = (
                qris_data.get("qr_content")
                or data.get("qr_content")
                or data.get("qr_string")
            )
            if qr_content:
                logger.info(f"Generated DOKU Direct QRIS for invoice {invoice_number}")
                return {
                    "provider": "DOKU",
                    "invoice_number": invoice_number,
                    "transaction_id": invoice_number,
                    "amount": amount,
                    "package_name": package_name or self.merchant_name,
                    "qr_string": qr_content,
                    "nmid": qris_data.get("nmid"),
                    "checkout_url": None,
                    "status": "PENDING",
                    "expires_at": qris_data.get("expiration_time") or expiry_iso,
                    "created_at": timestamp,
                    "paid_at": None,
                }
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            errors.append(f"Direct QRIS HTTP {e.code}: {err_body}")
        except Exception as e:
            errors.append(f"Direct QRIS Error: {e}")

        error_summary = " | ".join(errors) if errors else "Tidak ada respons valid dari server DOKU."
        raise RuntimeError(f"Gagal membuat QRIS DOKU: {error_summary}")


_doku_service_instance: Optional[DokuPaymentService] = None


def get_doku_service() -> DokuPaymentService:
    global _doku_service_instance
    if _doku_service_instance is None:
        _doku_service_instance = DokuPaymentService()
    return _doku_service_instance
