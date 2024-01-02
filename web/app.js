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
const years = [2024, 2023]
let year
const inputYear = new URL(window.location.href).pathname.split('/')[1]
if (!years.includes(parseInt(inputYear))) {
  year = years[0]
} else {
  year = parseInt(inputYear)
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

})

Alpine.data('router', () => ({

  main (context) {
    const inputYear = context.params.year
    if (inputYear && !years.includes(parseInt(inputYear))) {
      document.dispatchEvent(
        new CustomEvent(
          'show-message', { detail: { message: "No tenim les dates d'aquest any! T'ensenyem l'actual." } }))
    }

    fetch(`/data/${year}/web_${year}.json`)
      .then(response => response.json())
      .then((data) => {

        data.common.forEach(h => Alpine.store('holidays').add(h))

        Alpine.store('holidays').localHolidays = data.local

        if (context.params.place) {
          const slug = context.params.place
          let place
          let match = false
          Alpine.store('holidays').localHolidays.some((p) => {
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

        document.dispatchEvent(
          new CustomEvent(
            'places-ready'))
      })
  }

}))

Alpine.data('message', () => ({
  text: 'Un error!! :(',
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
    document.addEventListener('places-ready', () => this.initSearch())
  },
  initSearch () {
    const config = {
      selector: '#search',
      placeHolder: '',
      data: {
        src: Alpine.store('holidays').localHolidays,
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
