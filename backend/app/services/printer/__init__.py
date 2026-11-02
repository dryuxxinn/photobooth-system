from backend.app.core.config import settings
from backend.app.services.printer.base import PrinterInterface
from backend.app.services.printer.simulated import SimulatedPrinter
from backend.app.services.printer.cups import CupsPrinter

_printer_instance: PrinterInterface = None


def get_printer_service() -> PrinterInterface:
    global _printer_instance
    if _printer_instance is None:
        if settings.PRINTER_DRIVER.lower() == "cups":
            _printer_instance = CupsPrinter(printer_name=settings.PRINTER_NAME)
        else:
            _printer_instance = SimulatedPrinter(printer_name=settings.PRINTER_NAME)
    return _printer_instance


def set_printer_service(service: PrinterInterface) -> None:
    global _printer_instance
    _printer_instance = service
