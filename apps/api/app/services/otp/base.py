from abc import ABC, abstractmethod


class OtpProvider(ABC):
    """Delivers a one-time code to a phone number."""

    #: True when the provider cannot really deliver (dev/test) and the code
    #: should be echoed back in the API response for manual entry.
    echoes_code: bool = False

    @abstractmethod
    async def send(self, phone: str, code: str) -> None:
        ...
