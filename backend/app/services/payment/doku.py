import base64
import hashlib
import hmac
import json
import logging
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple
import urllib.request
import urllib.error

from backend.app.core.config import settings

logger = logging.getLogger("doku_payment")


class DokuPaymentService:
    """
    DOKU Payment Gateway integration service.
    Handles Dynamic QRIS MPM (Merchant Presented Mode) generation and Webhook Notification verification.
    """

    def __init__(self):
        self.client_id = settings.DOKU_CLIENT_ID
        self.secret_key = settings.DOKU_SECRET_KEY
        self.is_production = settings.DOKU_IS_PRODUCTION
        self.merchant_name = settings.DOKU_MERCHANT_NAME
        self.expiry_minutes = settings.DOKU_QRIS_EXPIRY_MINUTES

    @property
    def base_url(self) -> str:
        if self.is_production:
            return "https://api.doku.com"
        return "https://api-sandbox.doku.com"

    @property
    def is_configured(self) -> bool:
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
        digest: str,
    ) -> str:
        """
        Generate DOKU HMAC-SHA256 signature header.
        Formula:
        HMACSHA256=base64(hmac_sha256(secret_key, "Client-Id:<id>\\nRequest-Id:<id>\\nRequest-Timestamp:<time>\\nRequest-Target:<path>\\nDigest:<digest>"))
        """
        component = (
            f"Client-Id:{self.client_id}\n"
            f"Request-Id:{request_id}\n"
            f"Request-Timestamp:{timestamp}\n"
            f"Request-Target:{target_path}\n"
            f"Digest:{digest}"
        )
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
        target_path: str = "/session/payment/doku/notify",
    ) -> Tuple[bool, str]:
        """
        Verify incoming DOKU notification signature.
        Returns (is_valid, reason).
        """
        if not self.is_configured:
            # If keys aren't configured yet, allow for testing
            return True, "DOKU credentials not set, signature check bypassed."

        client_id = headers.get("Client-Id") or headers.get("client-id")
        request_id = headers.get("Request-Id") or headers.get("request-id")
        timestamp = headers.get("Request-Timestamp") or headers.get("request-timestamp")
        signature = headers.get("Signature") or headers.get("signature")

        if not signature:
            return False, "Missing Signature header in DOKU webhook notification."

        digest = self._generate_digest(body_bytes)
        expected_signature = self._generate_signature(request_id or "", timestamp or "", target_path, digest)

        # Constant-time comparison to prevent timing attacks
        if hmac.compare_digest(signature, expected_signature):
            return True, "Valid signature"
        
        # Also check without target prefix variations
        alt_signature = self._generate_signature(request_id or "", timestamp or "", "/payment/doku/notify", digest)
        if hmac.compare_digest(signature, alt_signature):
            return True, "Valid signature"

        logger.warning(
            f"DOKU signature mismatch. Received: {signature}, Expected: {expected_signature}"
        )
        return False, "Signature verification failed."

    def generate_qris(
        self,
        amount: int,
        invoice_number: Optional[str] = None,
        package_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a Dynamic QRIS MPM payment via DOKU API.
        If DOKU credentials are not configured or the network request fails,
        falls back gracefully to a standard simulated QRIS payload.
        """
        if not invoice_number:
            invoice_number = f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

        target_path = "/qris-merchant-presentation/v2/generate-qr-code"
        now_dt = datetime.now(timezone.utc)
        timestamp = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        request_id = str(uuid.uuid4())

        expiry_dt = now_dt + timedelta(minutes=self.expiry_minutes)
        expiry_iso = expiry_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        payload = {
            "order": {
                "invoice_number": invoice_number,
                "amount": amount,
            },
            "payment": {
                "type": "SALE",
            },
        }

        # Check if DOKU is configured with real merchant keys
        if self.is_configured:
            try:
                body_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
                digest = self._generate_digest(body_bytes)
                signature = self._generate_signature(request_id, timestamp, target_path, digest)

                url = f"{self.base_url}{target_path}"
                req = urllib.request.Request(
                    url,
                    data=body_bytes,
                    headers={
                        "Content-Type": "application/json",
                        "Client-Id": self.client_id,
                        "Request-Id": request_id,
                        "Request-Timestamp": timestamp,
                        "Signature": signature,
                    },
                    method="POST",
                )

                logger.info(f"Connecting to DOKU API: {url} (Invoice: {invoice_number}, Amount: {amount})")
                with urllib.request.urlopen(req, timeout=10) as response:
                    res_body = response.read().decode("utf-8")
                    data = json.loads(res_body)

                # Extract QR content from DOKU response
                qris_data = data.get("qris_data", {})
                qr_content = qris_data.get("qr_content")
                if qr_content:
                    logger.info(f"Successfully generated DOKU Dynamic QRIS for invoice {invoice_number}")
                    return {
                        "provider": "DOKU",
                        "invoice_number": invoice_number,
                        "transaction_id": invoice_number,
                        "amount": amount,
                        "package_name": package_name or "Sweet Studio Photobooth",
                        "qr_string": qr_content,
                        "status": "PENDING",
                        "expires_at": qris_data.get("expiration_time") or expiry_iso,
                        "created_at": timestamp,
                        "paid_at": None,
                        "is_simulated": False,
                    }
            except Exception as e:
                logger.error(f"Failed to generate DOKU QRIS via API: {e}. Falling back to simulation mode.")

        # Graceful Fallback: Simulated Standard EMVCo Dynamic QRIS
        simulated_qr_string = (
            f"00020101021226580014ID.CO.QRIS.WWW0118936009143{invoice_number[-12:]}"
            f"520458125303360540{amount}5802ID5912SWEET STUDIO6007JAKARTA6304D0C0"
        )
        return {
            "provider": "DOKU_SIMULATED" if self.is_configured else "SIMULATED",
            "invoice_number": invoice_number,
            "transaction_id": invoice_number,
            "amount": amount,
            "package_name": package_name or "Sweet Studio Photobooth",
            "qr_string": simulated_qr_string,
            "status": "PENDING",
            "expires_at": expiry_iso,
            "created_at": timestamp,
            "paid_at": None,
            "is_simulated": True,
        }


_doku_service_instance: Optional[DokuPaymentService] = None


def get_doku_service() -> DokuPaymentService:
    global _doku_service_instance
    if _doku_service_instance is None:
        _doku_service_instance = DokuPaymentService()
    return _doku_service_instance
