# Calendari laboral a Catalunya - quanesfesta.cat


(English below)

### Dades

El directori `data` conté un script en Python necessari per a obtenir les dades, extretes de [webs de la Generalitat](https://treball.gencat.cat/ca/ambits/relacions_laborals/ci/calendari_laboral/festes_generals_locals_Cat/index.html).

Cal instal·lar els requeriments (dins d'un virtualenv):

    pip install -r requirements.txt

Per veure les comandes disponibles:

    python scraper.py --help

#### Afegir les festes d'un any

1. Actualizar la variable `YEAR` a `scraper.py`
2. Crear manualment l'arxiu `festes_catalunya_{year}.csv`
3. Executar `python scraper.py places-ids` per obtenir totes les localitats
4. Executar `python scraper.py all-places` per obtenir les festes


### Lloc web

El directori `web` conté l'aplicació web. Per desenvolupar-la localment:

    npm install
    npm run dev

### Llicència

Les dades generades estan subjectes a la [Llicència oberta d'ús d'informació - Catalunya](https://governobert.gencat.cat/ca/dades_obertes/llicencia-oberta-informacio-catalunya/).

El codi font contingut en aquest repositori té una llicència MIT (vegeu LICENSE.txt)

---

### Data

The `data` folder contains the Python script used to scrape the data from the [Catalan governement sites](https://treball.gencat.cat/ca/ambits/relacions_laborals/ci/calendari_laboral/festes_generals_locals_Cat/index.html).

Install requirements (in your own virtualenv):

    pip install -r requirements.txt

To show available commands:

    python scraper.py --help

#### Adding a new year holidays

1. Update the `YEAR` variable in `scraper.py`
2. Manually create the file `festes_catalunya_{year}.csv`
3. Run `python scraper.py places-ids` to get the updated locations
4. Run `python scraper.py all-places` to get all holidays

### Web app

The `web` folder contains the web application. To develop it locally, run:

    npm install
    npm run dev

### License

Generated datasets are subject to [Llicència oberta d'ús d'informació Catalunya](https://governobert.gencat.cat/ca/dades_obertes/llicencia-oberta-informacio-catalunya/).

The source code of this repository is released under the MIT license (see LICENSE.txt)
