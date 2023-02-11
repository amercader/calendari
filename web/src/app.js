import differenceInDays from 'date-fns/differenceInDays'
import Alpine from 'alpinejs'
import autoComplete from '@tarekraafat/autocomplete.js'

import 'bootstrap/dist/css/bootstrap.min.css'
import '@tarekraafat/autocomplete.js/dist/css/autoComplete.02.css'
import './style.css'

window.Alpine = Alpine

const year = 2023
const holidays = [

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
]

const dayFormatter = new Intl.DateTimeFormat('ca', { month: 'long', day: 'numeric' })
const weekDayFormatter = new Intl.DateTimeFormat('ca', { weekday: 'long' })

document.addEventListener('alpine:init', () => {
  Alpine.store('holidays', {
    currentPlace: "Catalunya",
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
    }
  })

  holidays.forEach(h => Alpine.store('holidays').add(h))
})

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
const search = new autoComplete(config) // eslint-disable-line new-cap

search.input.addEventListener('selection', function (event) {
  const feedback = event.detail
  search.input.blur()

  let name = feedback.selection.value.n

  search.input.value = name

  Alpine.store('holidays').currentPlace = name
  Alpine.store('holidays').removeLocals()
  feedback.selection.value.d.forEach(d => {
    const date = `${year}-${d.slice(0, 2)}-${d.slice(2, 4)}`
    Alpine.store('holidays').add({ date, name: 'Festa local', scope: 'Local' })
  })
})

Alpine.start()
