"""Angles are numeric decimal degrees internally; text is an input/output format."""

import math
import re


def parse_angle(value, limit=180):
    if isinstance(value, str):
        text = value.strip().replace(",", ".").replace("−", "-")
        if not re.fullmatch(r"[+-]?\d+(?:\.\d+)?(?:[\s°º′'’\":″]+\d+(?:\.\d+)?){0,2}[\s°º′'’\":″]*", text):
            raise ValueError("Введите угол числом или как 55°45′30″")
        parts = [float(p) for p in re.findall(r"\d+(?:\.\d+)?", text)]
        if len(parts) > 1 and (not parts[0].is_integer() or parts[1] >= 60):
            raise ValueError("Минуты должны быть меньше 60; градусы — целыми")
        if len(parts) == 3 and (not parts[1].is_integer() or parts[2] >= 60):
            raise ValueError("Секунды должны быть меньше 60; минуты — целыми")
        value = sum(part / 60 ** i for i, part in enumerate(parts))
        if text.startswith("-"):
            value = -value
    value = float(value)
    if not math.isfinite(value) or abs(value) > limit:
        raise ValueError(f"Угол должен быть конечным числом в диапазоне ±{limit}°")
    return value


def format_angle(value, fmt="deg_dec"):
    if value is None:
        return ""
    value = float(value)
    if fmt == "deg_dec" or fmt is None:
        return value
    sign = "-" if value < 0 else ""
    # Round total units first, so 59.999999 seconds carry into the next minute.
    scale = 10000 if fmt == "deg_min" else 100
    units_per_degree = 60 if fmt == "deg_min" else 3600
    total = math.floor(abs(value) * units_per_degree * scale + 0.5)
    degrees, remainder = divmod(total, units_per_degree * scale)
    if fmt == "deg_min":
        return f"{sign}{degrees}°{remainder / scale:07.4f}′"
    minutes, seconds = divmod(remainder, 60 * scale)
    return f"{sign}{degrees}°{minutes:02d}′{seconds / scale:05.2f}″"
