# /geoconverter/backend/app/export_utils.py
from typing import List
from io import BytesIO

from openpyxl import Workbook

from .schemas import Point


def _safe(v):
    return v if v is not None else ""


def build_catalog_xlsx(rows: List[Point], crs_from: str, crs_to: str) -> bytes:
    """
    Каталог координат по результатам пересчёта.

    Требования:
    - нет столбца "Наименование";
    - выводим только те координатные столбцы, которые реально заполнены (lat/lon/x/y).
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Каталог"

    # Определяем, какие поля вообще используются
    has_lat = any(p.lat is not None for p in rows)
    has_lon = any(p.lon is not None for p in rows)
    has_x = any(p.x is not None for p in rows)
    has_y = any(p.y is not None for p in rows)

    # Если вообще нет данных — просто вернём пустую книгу с заголовком
    if not (has_lat or has_lon or has_x or has_y):
        ws.append([f"Каталог координат ({crs_from} → {crs_to})"])
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=1)
        bio = BytesIO()
        wb.save(bio)
        return bio.getvalue()

    # Строка заголовка (шапка)
    headers = ["№"]
    if has_lat:
        headers.append("Широта")
    if has_lon:
        headers.append("Долгота")
    if has_x:
        headers.append("X")
    if has_y:
        headers.append("Y")

    ws.append([f"Каталог координат ({crs_from} → {crs_to})"])
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))

    # Строка с названиями колонок
    ws.append(headers)

    # Данные
    for idx, p in enumerate(rows, start=1):
        row = [idx]
        if has_lat:
            row.append(_safe(p.lat))
        if has_lon:
            row.append(_safe(p.lon))
        if has_x:
            row.append(_safe(p.x))
        if has_y:
            row.append(_safe(p.y))
        ws.append(row)

    bio = BytesIO()
    wb.save(bio)
    return bio.getvalue()


def build_statement_xlsx(
    rows_in: List[Point],
    rows_out: List[Point],
    crs_from: str,
    crs_to: str,
) -> bytes:
    """
    Ведомость расчёта: исходные и полученные координаты в одной таблице.

    Требования:
    - нет столбца "Наименование";
    - выводим только те координатные столбцы, которые реально заполнены;
      отдельно для исходных и результирующих координат.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Ведомость"

    max_len = max(len(rows_in), len(rows_out)) if (rows_in or rows_out) else 0

    # Определяем, какие поля используются в исходных и результирующих
    has_lat_in = any(p.lat is not None for p in rows_in)
    has_lon_in = any(p.lon is not None for p in rows_in)
    has_x_in = any(p.x is not None for p in rows_in)
    has_y_in = any(p.y is not None for p in rows_in)

    has_lat_out = any(p.lat is not None for p in rows_out)
    has_lon_out = any(p.lon is not None for p in rows_out)
    has_x_out = any(p.x is not None for p in rows_out)
    has_y_out = any(p.y is not None for p in rows_out)

    # Если вообще нет данных — вернём только заголовок
    if max_len == 0 or not (
        has_lat_in
        or has_lon_in
        or has_x_in
        or has_y_in
        or has_lat_out
        or has_lon_out
        or has_x_out
        or has_y_out
    ):
        ws.append([f"Ведомость расчёта координат ({crs_from} → {crs_to})"])
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=1)
        bio = BytesIO()
        wb.save(bio)
        return bio.getvalue()

    # Строим заголовки динамически
    headers = ["№"]

    # Исходные координаты
    if has_lat_in:
        headers.append("Исх. широта")
    if has_lon_in:
        headers.append("Исх. долгота")
    if has_x_in:
        headers.append("Исх. X")
    if has_y_in:
        headers.append("Исх. Y")

    # Результирующие координаты
    if has_lat_out:
        headers.append("Рез. широта")
    if has_lon_out:
        headers.append("Рез. долгота")
    if has_x_out:
        headers.append("Рез. X")
    if has_y_out:
        headers.append("Рез. Y")

    ws.append([f"Ведомость расчёта координат ({crs_from} → {crs_to})"])
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))

    ws.append(headers)

    # Данные
    for idx in range(max_len):
        p_in = rows_in[idx] if idx < len(rows_in) else Point()
        p_out = rows_out[idx] if idx < len(rows_out) else Point()

        row = [idx + 1]

        # Исходные
        if has_lat_in:
            row.append(_safe(p_in.lat))
        if has_lon_in:
            row.append(_safe(p_in.lon))
        if has_x_in:
            row.append(_safe(p_in.x))
        if has_y_in:
            row.append(_safe(p_in.y))

        # Результирующие
        if has_lat_out:
            row.append(_safe(p_out.lat))
        if has_lon_out:
            row.append(_safe(p_out.lon))
        if has_x_out:
            row.append(_safe(p_out.x))
        if has_y_out:
            row.append(_safe(p_out.y))

        ws.append(row)

    bio = BytesIO()
    wb.save(bio)
    return bio.getvalue()
