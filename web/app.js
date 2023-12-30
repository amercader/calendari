import differenceInDays from 'date-fns/differenceInDays'
import format from 'date-fns/format'
import slugify from 'slugify'
import PineconeRouter from 'pinecone-router'
import Alpine from 'alpinejs'
import autoComplete from '@tarekraafat/autocomplete.js'

import 'bootstrap/dist/css/bootstrap.min.css'
import '@tarekraafat/autocomplete.js/dist/css/autoComplete.02.css'
import './src/style.css'

Alpine.plugin(PineconeRouter)

window.Alpine = Alpine

const uuid = 'e11d0663-1ffd-4936-83d2-7fd6a2ccf874'
const year = 2024
const years = [2023, 2024]

const holidays = {
  2023: [
    { date: '2023-01-06', name: 'Reis', scope: 'Catalunya' },
    { date: '2023-04-07', name: 'Divendres Sant', scope: 'Espanya' },
    { date: '2023-04-10', name: 'Pasqua Florida', scope: 'Catalunya' },
    { date: '2023-05-01', name: 'Festa del Treball', scope: 'Espanya' },
    { date: '2023-06-24', name: 'Sant Joan', scope: 'Catalunya' },
    { date: '2023-08-15', name: "L'Assumpció", scope: 'Espanya' },
    { date: '2023-09-11', name: 'Diada Nacional de Catalunya', scope: 'Catalunya' },
    { date: '2023-10-12', name: "Festa Nacional d'Espanya", scope: 'Espanya' },
    { date: '2023-11-01', name: 'Tots Sants', scope: 'Espanya' },
    { date: '2023-12-06', name: 'Dia de la Constitució', scope: 'Espanya' },
    { date: '2023-12-08', name: 'La Immaculada', scope: 'Espanya' },
    { date: '2023-12-25', name: 'Nadal', scope: 'Espanya' },
    { date: '2023-12-26', name: 'Sant Esteve', scope: 'Catalunya' }
  ],
  2024: [
    { date: '2024-01-01', name: "Cap d'Any", scope: 'Espanya' },
    { date: '2024-01-06', name: 'Reis', scope: 'Catalunya' },
    { date: '2024-03-29', name: 'Divendres Sant', scope: 'Espanya' },
    { date: '2024-04-01', name: 'Pasqua Florida', scope: 'Catalunya' },
    { date: '2024-05-01', name: 'Festa del Treball', scope: 'Espanya' },
    { date: '2024-06-24', name: 'Sant Joan', scope: 'Catalunya' },
    { date: '2024-08-15', name: "L'Assumpció", scope: 'Espanya' },
    { date: '2024-09-11', name: 'Diada Nacional de Catalunya', scope: 'Catalunya' },
    { date: '2024-10-12', name: "Festa Nacional d'Espanya", scope: 'Espanya' },
    { date: '2024-11-01', name: 'Tots Sants', scope: 'Espanya' },
    { date: '2024-12-06', name: 'Dia de la Constitució', scope: 'Espanya' },
    { date: '2024-12-25', name: 'Nadal', scope: 'Espanya' },
    { date: '2024-12-26', name: 'Sant Esteve', scope: 'Catalunya' }
  ]
}

const dayFormatter = new Intl.DateTimeFormat('ca', { month: 'long', day: 'numeric' })
const weekDayFormatter = new Intl.DateTimeFormat('ca', { weekday: 'long' })

const commonSlugify = function (text) {
  return slugify(text.replace("'", '-'), { lower: true })
}

fetch(`/data/${year}/schema.jsonld`)
  .then(response => response.text())
  .then(structuredDataText => {
    const script = document.createElement('script')
    script.setAttribute('type', 'application/ld+json')
    script.textContent = structuredDataText
    document.head.appendChild(script)
  })

document.addEventListener('alpine:init', () => {
  Alpine.store('holidays', {
    year,
    currentPlace: 'Catalunya',
    pendingPlace: null,
    calendarReady: false,
    next: {},
    daysUntilNext: null,
    holidays: [],
    add (holiday) {
      let newIndex = this.holidays.findIndex(h => h.date > holiday.date)
      if (newIndex === -1) {
        newIndex = this.holidays.length
      }
      const holidayDate = new Date(holiday.date)
      holiday.past = holidayDate < new Date()
      holiday.localeDate = holiday.localeDate || dayFormatter.format(holidayDate)
      holiday.weekDay = holiday.weekDay || weekDayFormatter.format(holidayDate)

      this.holidays.splice(newIndex, 0, holiday)

      const nextIndex = this.holidays.findIndex(h => !h.past)

      this.next = (nextIndex !== -1) ? this.holidays[nextIndex] : null
      this.daysUntilNext = (this.next) ? differenceInDays(new Date(this.next.date), new Date()) : null
    },
    removeLocals () {
      for (let i = this.holidays.length - 1; i >= 0; i--) {
        if (this.holidays[i].scope === 'Local') {
          this.holidays.splice(i, 1)
        }
      }
    },
    updatePlace (place, dates) {
      this.currentPlace = place
      this.removeLocals()
      const localDates = []
      dates.forEach(d => {
        const date = `${year}-${d.slice(0, 2)}-${d.slice(2, 4)}`
        localDates.push(date)
        this.add({ date, name: 'Festa local', scope: 'Local' })
      })
      document.dispatchEvent(new CustomEvent('new-local-dates', { detail: { dates: localDates, place } }))
    },
    get currentPlaceParsed () {
      let prepo = 'a'
      let name = this.currentPlace
      if (this.currentPlace.startsWith('el ')) {
        prepo = 'al '
        name = name.replace(/el /, '')
      } else if (this.currentPlace.startsWith('els ')) {
        prepo = 'als '
        name = name.replace(/els /, '')
      }
      return `${prepo} <span class="place-name">${name}</span>`
    }

  })

  holidays[Alpine.store('holidays').year].forEach(h => Alpine.store('holidays').add(h))
})

Alpine.data('router', () => ({

  main (context) {
    const inputYear = context.params.year

    if (!years.includes(parseInt(inputYear))) {
      document.dispatchEvent(
        new CustomEvent(
          'show-message', { detail: { message: "No tenim les dates d'aquest any! T'ensenyem l'actual." } }))
      Alpine.store('holidays').year = years[0]
    } else {
      Alpine.store('holidays').year = inputYear
    }
    if (context.params.place) {
      const slug = context.params.place
      let place
      let match = false
      window.localHolidays.some((p) => {
        place = p
        match = commonSlugify(p.n, { lower: true }) === slug
        return match
      })
      if (match) {
        if (!Alpine.store('holidays').calendarReady) {
          Alpine.store('holidays').pendingPlace = { name: place.n, dates: place.d }
        } else {
          Alpine.store('holidays').updatePlace(place.n, place.d)
        }
      } else {
        document.dispatchEvent(
          new CustomEvent(
            'show-message', { detail: { message: "Lloc desconegut! T'ensenyem les fetes a tot Catalunya." } }))
      }
    }
  }

}))

Alpine.data('message', () => ({
  text: 'un error!! :(',
  alertOpen: false,
  init () {
    document.addEventListener('show-message', (e) => this.show(e.detail.message))
  },
  show (message) {
    this.text = message
    this.alertOpen = true
  },
  toggleAlert () {
    this.alertOpen = !this.alertOpen
  }

}))

Alpine.data('search', () => ({
  alertOpen: false,
  searchControl: null,
  init () {
    const config = {
      selector: '#search',
      placeHolder: '',
      data: {
        src: window.localHolidays,
        keys: ['n']
      },
      resultItem: {
        highlight: {
          render: true
        }
      }
    }
    this.searchControl = new autoComplete(config) // eslint-disable-line new-cap
    this.searchControl.input.addEventListener('selection', this.onResult.bind(this))
  },

  onResult (event) {
    const feedback = event.detail
    this.searchControl.input.blur()

    const name = feedback.selection.value.n
    const dates = feedback.selection.value.d

    if (!dates) {
      this.toggleAlert()
      return
    }
    this.searchControl.input.value = name

    history.pushState({}, '', `/${year}/` + commonSlugify(name, { lower: true }))

    Alpine.store('holidays').updatePlace(name, dates)
  },

  toggleAlert () {
    this.alertOpen = !this.alertOpen
  }

}))

Alpine.data('calendar', () => ({
  a: document.getElementById('downloadCalendar'),
  mainCalendar: null,
  localCalendar: null,
  init () {
    fetch(`/data/${year}/festes_catalunya_${year}.ics`)
      .then((response) => response.text())
      .then((data) => {
        this.mainCalendar = data

        document.addEventListener('new-local-dates', (e) => this.updateLocalCalendar(e.detail.dates, e.detail.place))
        Alpine.store('holidays').calendarReady = true
        const pendingPlace = Alpine.store('holidays').pendingPlace
        if (pendingPlace && pendingPlace.name) {
          Alpine.store('holidays').updatePlace(pendingPlace.name, pendingPlace.dates)
        }
      })
  },
  updateLocalCalendar (dates, place) {
    const localCalendar = this.mainCalendar.trim().split('\r\n')
    dates.forEach((d) => {
      const date = new Date(d)
      const start = format(date, "yyyyMMdd'T'000000")
      const end = format(date.setDate(date.getDate() + 1), "yyyyMMdd'T'000000")
      const timestamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'")
      const vevent = [
        'BEGIN:VEVENT',
        `SUMMARY:Festa local a ${place}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `DTSTAMP:${timestamp}`,
        `UID:${uuid}-${d}@quanesfesta.cat`,
        'END:VEVENT'
      ]
      localCalendar.splice(localCalendar.length - 1, 0, ...vevent)
    })
    const blob = new Blob(localCalendar.map(l => l + '\r\n'), { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    this.a.setAttribute('href', url)
    this.a.setAttribute('download', `festes_${commonSlugify(place, { replacement: '_', lower: true })}_${year}.ics`)
  }
}))

Alpine.start()
