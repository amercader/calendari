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
5. Executar `python scraper.py web-files` per obtenir els nous arxius de producció
6. Actualitzar les constants `year`, `years` i `holidays` a l'arxius `app.js` TODO: automatitzar
7. Reemplaçar l'any anterior pel nou any a l'arxiu `index.html` TODO: automatitzar
8. Actualitzar redirecció a l'arxiu `netlify.toml`


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
5. Run `python scraper.py web-files` to get the new production files
6. Update the constants `year`, `years` and `holidays` in file `app.js` TODO: automate
7. Replace all occurences of the previous year with the new one in file `index.html` TODO: automate
8. Update redirect in `netlify.toml`


### Web app

The `web` folder contains the web application. To develop it locally, run:

    npm install
    npm run dev

### License

Generated datasets are subject to [Llicència oberta d'ús d'informació Catalunya](https://governobert.gencat.cat/ca/dades_obertes/llicencia-oberta-informacio-catalunya/).

The source code of this repository is released under the MIT license (see LICENSE.txt)
