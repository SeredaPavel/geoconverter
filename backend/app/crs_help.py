"""Short user guidance. Research provenance stays in the registry documents."""

PLANAR_COORDINATES = 'Координаты в метрах: X — восток, Y — север.'
GEOGRAPHIC_COORDINATES = 'Координаты: широта и долгота. Формат углов выбирается отдельно.'


def msk_help(system, zone, available):
    region, number = system['source_id'], zone['label']
    if not available:
        reason = ('Параметры перехода требуют уточнения.' if region == '30'
                  else 'Параметры этой зоны ещё уточняются.')
        return f"Регион: {system['region_label']}. Зона {number}. {reason} Пересчёт пока недоступен."
    width = system.get('zone_width_degrees')
    width_note = f" Ширина зоны — {str(width).replace('.', ',')}°." if width else ''
    description = f"Регион: {system['region_label']}. Зона {number}.{width_note}\n{PLANAR_COORDINATES}"
    if region == 'mos':
        return (f'Городская система координат Москвы (МГГТ).\n{PLANAR_COORDINATES}\n'
                'Доступен приближённый пересчёт. Для точных геодезических и кадастровых работ '
                'нужны официальные параметры перехода.')
    if region == '1964':
        return (f'Система координат Санкт-Петербурга 1964 года.\n{PLANAR_COORDINATES}\n'
                'Для данных МСК-78 с местными поправками этот вариант не подходит.')
    if region == '33':
        return description + '\nВариант на базе СК-63. Не подходит для исходных данных в МСК-33 на базе СК-95.'
    return description + '\nНомер зоны должен совпадать с указанным в исходных данных.'


def sk63_help(district, zone, width=None):
    width_note = f" Ширина зоны — {width}°." if width else ''
    return (f'СК-63: район {district}, зона {zone}.{width_note}\n{PLANAR_COORDINATES}\n'
            'Буква района и номер зоны должны совпадать с указанными в исходных данных.')


BASE_HELP = {
    'EPSG:4326': f'Глобальная система координат WGS-84.\n{GEOGRAPHIC_COORDINATES}',
    'GSK2011_GEOG': f'Географические координаты ГСК-2011.\n{GEOGRAPHIC_COORDINATES}',
    'SK42_GEOG': f'Географические координаты СК-42.\n{GEOGRAPHIC_COORDINATES}',
    'SK95_GEOG': f'Географические координаты СК-95.\n{GEOGRAPHIC_COORDINATES}',
    'PZ90_GEOG': f'Географические координаты ПЗ-90.\n{GEOGRAPHIC_COORDINATES}\n'
                 'Выбирайте вариант ПЗ-90, указанный в исходных данных.',
}
for code, version in [('PZ90_02_GEOG', 'ПЗ-90.02'), ('PZ90_11_GEOG', 'ПЗ-90.11')]:
    BASE_HELP[code] = (f'Географические координаты {version}.\n{GEOGRAPHIC_COORDINATES}\n'
                       'При переходе в другую СК высота принимается равной 0 м; '
                       'изменение координат со временем не учитывается.')
for code in ['GK_SK42', 'GK_SK95', 'GK_GSK2011']:
    BASE_HELP[code] = (f'{PLANAR_COORDINATES}\nЗоны 3°: номера 7–64. Зоны 6°: номера 4–32.\n'
                       'Ширину зоны выбирайте по исходным данным. Для автоопределения исходной зоны '
                       'X должен содержать номер зоны, например 7 500 000 м — зона 7.')
