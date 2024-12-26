# -*- coding: utf-8 -*-

import argparse
import csv
import datetime
import json
import os
from pathlib import Path
import shutil
import sys
import time
import uuid
from random import randrange
from urllib.parse import parse_qs, urlencode, urlparse

import openpyxl
import requests
from bs4 import BeautifulSoup
from icalendar import Calendar, Event
from selenium import webdriver
from selenium.webdriver.common.by import By
from tqdm.auto import tqdm
from slugify import slugify

YEAR = 2024
BASE_URL = "https://ocupacio.extranet.gencat.cat"
BASE_ID = "e11d0663-1ffd-4936-83d2-7fd6a2ccf874"

DATA_DIR = "."
PUBLIC_DIR = "../web/public"
OUTPUT_DIR = f"{PUBLIC_DIR}/data/{YEAR}"

HOLIDAY_TYPE_CLASSES = {
    "dia2": "Estatal",
    "dia3": "Autonòmica",
    "dia4": "Local",
}


def get_param_from_url(url, name):
    return parse_qs(urlparse(url)).get(name)


def get_places_links():
    r = requests.post(
        f"{BASE_URL}/treball_clt/selMapaCat.do",
        data={"accio": "Create", "contPobla": 1, "any": YEAR, "first": 1, "oper": ""},
    )

    soup = BeautifulSoup(r.text, "html.parser")
    out = []
    for link in soup.find_all("a", attrs={"class": "link", "style": "CURSOR:hand"}):
        out.append(
            {
                "id": parse_qs(urlparse(link.get("href")).query).get("codiP")[0],
                "name": link.text.strip(),
                "url": BASE_URL + link.get("href"),
            }
        )

    return out


def save_places_links():
    with open(f"{DATA_DIR}/places_links.json", "w") as f:
        json.dump(get_places_links(), f)


def id_to_date(id_):
    month = id_[3 : id_.index("dia")].zfill(2)
    day = id_[id_.index("dia") + 3 :].zfill(2)

    return f"{YEAR}-{month}-{day}"


def get_place_holidays(place_id, driver):

    url = BASE_URL + "/treball_clt/festesMapa.do?"
    params = {
        "any": YEAR,
        "codiP": place_id,
        "tipusSeleccio": "poblacio",
        "oper": "View",
        "preAction": "selMapaCat",
    }
    url += urlencode(params)

    driver.get(url)

    out = {}

    out["name"] = (
        driver.find_element(By.TAG_NAME, "h2").text.replace(str(YEAR), "").strip()
    )
    out["id"] = place_id
    holidays = []
    for class_ in HOLIDAY_TYPE_CLASSES:
        for day in driver.find_elements(By.CSS_SELECTOR, f"td.{class_}"):
            holidays.append(id_to_date(day.get_attribute("id")))
    out["holidays"] = sorted(holidays)

    return out


def get_common_holidays():
    with open(f"{DATA_DIR}/festes_catalunya_{YEAR}.csv", newline="") as f:
        reader = csv.DictReader(f)
        return [row for row in reader]


def get_missing_places():
    with open(f"{DATA_DIR}/festes_locals_catalunya_{YEAR}.csv") as f:
        reader = csv.DictReader(f)
        return [row["id"] for row in reader if not row["festa1"]]


def scrape_places(driver, ids=None, start=None, new_file=True, use_cache=True):

    with open(f"{DATA_DIR}/places_links.json") as f:
        places = json.load(f)

    if not ids:
        ids = [p["id"] for p in sorted(places, key=lambda p: p["name"])]

    if start:
        # Pick up where we left last time
        ids = ids[ids.index(start) :]

    common = [c["data"] for c in get_common_holidays()]

    # Festa d'Aran
    common.append(f"{YEAR}-06-17")

    output_csv = f"{DATA_DIR}/festes_locals_catalunya_{YEAR}.csv"
    if new_file and os.path.exists(output_csv):
        os.remove(output_csv)

    with open(output_csv, "a+") as f:
        fields = ["id", "nom", "festa1", "festa2"]
        writer = csv.DictWriter(f, fieldnames=fields)
        if not f.readline().startswith("id,"):
            writer.writeheader()

        pbar = tqdm(ids)
        for id_ in pbar:

            place_file = f"{DATA_DIR}/llocs/{id_}_{YEAR}.json"
            place = None
            if use_cache:
                if os.path.exists(place_file):
                    with open(place_file) as pf:
                        place = json.load(pf)
            if not place:
                time.sleep(randrange(3, 10))

                place = get_place_holidays(id_, driver)

            pbar.set_description(place["name"])

            if not place["holidays"]:
                print(f"No holidays for {place['name']}")
                continue

            local = sorted([d for d in place["holidays"] if d not in common])

            row = {
                "id": id_,
                "nom": place["name"],
                "festa1": local[0] if len(local) > 1 else "",
                "festa2": local[1] if len(local) == 2 else "",
            }

            writer.writerow(row)

            with open(place_file, "w") as f:
                json.dump(place, f)


def parse_name(name):
    if "," in name:
        parts = name.split(",")
        name = f"{parts[1]}{parts[0]}" if "'" in parts[1] else f"{parts[1]} {parts[0]}"
    return name.strip()


def _create_web_common_files():

    # Copy CSV file
    shutil.copy2(
        f"{DATA_DIR}/festes_catalunya_{YEAR}.csv",
        f"{OUTPUT_DIR}/festes_catalunya_{YEAR}.csv",
    )

    holidays = get_common_holidays()

    # Create XLSX file
    wb = openpyxl.Workbook()
    ws = wb.active

    ws.append(["data", "nom", "ambit"])
    for holiday in holidays:
        ws.append(list(holiday.values()))
    wb.save(f"{OUTPUT_DIR}/festes_catalunya_{YEAR}.xlsx")

    # Create JSON file
    with open(f"{OUTPUT_DIR}/festes_catalunya_{YEAR}.json", "w") as f:
        json.dump(holidays, f)


def _create_web_local_files():

    input_file = f"{DATA_DIR}/festes_locals_catalunya_{YEAR}.csv"

    # Copy CSV file
    shutil.copy2(
        input_file,
        f"{OUTPUT_DIR}/festes_locals_catalunya_{YEAR}.csv",
    )

    with open(input_file, newline="") as f:
        reader = csv.DictReader(f)
        rows = [row for row in reader]

    # Web JS
    common = get_common_holidays()
    common_web = []
    for holiday in common:
        common_web.append(
            {
                "date": holiday["data"],
                "name": holiday["nom"],
                "scope": holiday["ambit"],
            }
        )

    data = {
        "common": common_web,
        "local": [
            {
                "n": parse_name(row["nom"]),
                "d": [
                    row["festa1"].replace(f"{YEAR}", "").replace("-", ""),
                    row["festa2"].replace(f"{YEAR}", "").replace("-", ""),
                ]
                if row["festa1"]
                else None,
            }
            for row in rows
        ],
    }

    with open(f"{OUTPUT_DIR}/web_{YEAR}.json", "w") as f:
        json.dump(data, f)

    # JSON download
    with open(f"{OUTPUT_DIR}/festes_locals_catalunya_{YEAR}.json", "w") as f:
        json.dump(rows, f)

    # XLSX download
    wb = openpyxl.Workbook()
    ws = wb.active

    ws.append(["id", "nom", "festa1", "festa2"])
    for row in rows:
        ws.append(list(row.values()))
    wb.save(f"{OUTPUT_DIR}/festes_locals_catalunya_{YEAR}.xlsx")


def create_sitemap():

    base = "https://quanesfesta.cat"

    out = [
        base,
        f"{base}/{YEAR}",
    ]

    for ext in ["xlsx", "csv", "json"]:
        out.append(f"{base}/data/{YEAR}/festes_catalunya_{YEAR}.{ext}")
        out.append(f"{base}/data/{YEAR}/festes_locals_catalunya_{YEAR}.{ext}")

    input_file = f"{DATA_DIR}/festes_locals_catalunya_{YEAR}.csv"
    with open(input_file, newline="") as f:
        reader = csv.DictReader(f)
        rows = [row for row in reader]

    for row in rows:
        out.append(f'{base}/{YEAR}/{slugify(parse_name(row["nom"]))}')

    with open(f"{PUBLIC_DIR}/sitemap.txt", "w") as f:
        f.write("\n".join(out))


def create_schema_org():
    input_file = f"{DATA_DIR}/festes_catalunya_{YEAR}.csv"
    with open(input_file, newline="") as f:
        reader = csv.DictReader(f)
        rows = [row for row in reader]

    out = []

    # Event
    for row in rows:
        date = datetime.datetime.strptime(row["data"], "%Y-%m-%d")
        date_end = (date + datetime.timedelta(days=1)).strftime("%Y-%m-%d")

        out.append(
            {
                "@context": "http://schema.org",
                "@type": "Event",
                "startDate": row["data"],
                "endDate": date_end,
                "name": row["nom"],
                "location": {
                    "@type": "Place",
                    "name": "Catalonia",
                    "address": {"addressRegion": "Catalonia"},
                },
            }
        )

    # Dataset
    out.extend(
        [
            {
                "@context": "http://schema.org",
                "@type": "Dataset",
                "name": f"Festes laborals a Catalunya {YEAR}",
                "description": f"Public holidays in Catalonia for {YEAR}, including date, name and scope (national or regional)\nFestes laborals a Catalunya {YEAR}, inclou la data, el nom de la festa i l'àmbit (estatal o autonòmic)",
                "temporalCoverage": f"{YEAR}",
                "spatialCoverage": "Catalunya",
                "license": {
                    "@type": "CreativeWork",
                    "name": "Llicència oberta d'ús d'informació - Catalunya",
                    "url": "https://governobert.gencat.cat/ca/dades_obertes/llicencia-oberta-informacio-catalunya/",
                },
                "distribution": [
                    {
                        "@type": "DataDownload",
                        "contentUrl": f"https://quanesfesta.cat/{YEAR}/data/festes_catalunya_{YEAR}.xlsx",
                        "encodingFormat": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    },
                    {
                        "@type": "DataDownload",
                        "contentUrl": f"https://quanesfesta.cat/{YEAR}/data/festes_catalunya_{YEAR}.csv",
                        "encodingFormat": "application/csv",
                    },
                    {
                        "@type": "DataDownload",
                        "contentUrl": f"https://quanesfesta.cat/{YEAR}/data/festes_catalunya_{YEAR}.json",
                        "encodingFormat": "application/json",
                    },
                ],
            },
            {
                "@context": "http://schema.org",
                "@type": "Dataset",
                "name": f"Festes locals a Catalunya {YEAR}",
                "description": f"Local public holidays in Catalonia for {YEAR}, including date and location\nFestes laborals locals a Catalunya {YEAR}, inclou les dates i el nom de la localitat",
                "temporalCoverage": f"{YEAR}",
                "spatialCoverage": "Catalunya",
                "license": {
                    "@type": "CreativeWork",
                    "name": "Llicència oberta d'ús d'informació - Catalunya",
                    "url": "https://governobert.gencat.cat/ca/dades_obertes/llicencia-oberta-informacio-catalunya/",
                },
                "distribution": [
                    {
                        "@type": "DataDownload",
                        "contentUrl": f"https://quanesfesta.cat/{YEAR}/data/festes_locals_catalunya_{YEAR}.xlsx",
                        "encodingFormat": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    },
                    {
                        "@type": "DataDownload",
                        "contentUrl": f"https://quanesfesta.cat/{YEAR}/data/festes_locals_catalunya_{YEAR}.csv",
                        "encodingFormat": "application/csv",
                    },
                    {
                        "@type": "DataDownload",
                        "contentUrl": f"https://quanesfesta.cat/{YEAR}/data/festes_locals_catalunya_{YEAR}.json",
                        "encodingFormat": "application/json",
                    },
                ],
            },
        ]
    )

    with open(f"{OUTPUT_DIR}/schema.jsonld", "w") as f:
        json.dump(out, f, indent=4)


def create_web_files():

    Path(OUTPUT_DIR).mkdir(exist_ok=True)

    _create_web_common_files()

    _create_web_local_files()

    create_ics_file()

    create_sitemap()

    create_schema_org()


def create_ics_file():

    holidays = get_common_holidays()

    cal = Calendar()
    cal.add("prodid", "-//Quan és festa?//quanesfesta.cat//")
    cal.add("version", "2.0")
    for holiday in holidays:
        event = Event()
        event.add("summary", holiday["nom"])
        date = datetime.datetime.strptime(holiday["data"], "%Y-%m-%d")
        event.add("dtstart", date)
        event.add("dtend", date + datetime.timedelta(days=1))
        event.add("dtstamp", datetime.datetime.now(datetime.timezone.utc))
        event.add("uid", f"{BASE_ID}-{holiday['data']}@quanesfesta.cat")

        cal.add_component(event)

    with open(f"{OUTPUT_DIR}/festes_catalunya_{YEAR}.ics", "wb") as f:
        f.write(cal.to_ical())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "command",
        choices=[
            "place",
            "all-places",
            "missing-places",
            "places-ids",
            "web-files",
            "calendar",
            "sitemap",
            "schemaorg",
        ],
        help="""Action to perform.""",
    )
    parser.add_argument(
        "--id",
        "-i",
        help="""Place id if only getting one""",
    )
    parser.add_argument(
        "--start",
        "-s",
        help="""Where to start if getting all holidays""",
    )
    args = parser.parse_args()

    if args.command in ["place", "all-places", "missing-places", "places-ids"]:
        try:
            driver = webdriver.Firefox()
            if args.command == "place":
                if not args.id:
                    print("Need to provide an --id")

                scrape_places(
                    driver,
                    ids=[args.id],
                )
            elif args.command == "all-places":

                scrape_places(driver, start=args.start)

            elif args.command == "missing-places":

                missing_ids = get_missing_places()
                scrape_places(driver, ids=missing_ids, new_file=False, use_cache=False)

            elif args.command == "places-ids":

                save_places_links()

        finally:
            driver.quit()

            sys.exit()

    if args.command == "web-files":
        create_web_files()

    elif args.command == "calendar":
        create_ics_file()

    elif args.command == "sitemap":
        create_sitemap()

    elif args.command == "schemaorg":
        create_schema_org()
