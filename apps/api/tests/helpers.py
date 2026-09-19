import io

from PIL import Image


def make_image(fmt: str = "JPEG", size=(1600, 1200), color=(200, 30, 60)) -> bytes:
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def upload_files(*images: bytes, name="photo.jpg", mime="image/jpeg"):
    return [("files", (f"{i}_{name}", img, mime)) for i, img in enumerate(images)]
