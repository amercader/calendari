import differenceInDays from 'date-fns/differenceInDays'
import Alpine from 'alpinejs'
import autoComplete from '@tarekraafat/autocomplete.js'

import './style.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@tarekraafat/autocomplete.js/dist/css/autoComplete.02.css'

window.Alpine = Alpine

const holidays2023 = [
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
let nextHoliday = null
const holidays = holidays2023.map(h => {
  const holidayDate = new Date(h.date)
  const past = holidayDate < new Date()
  const out = {
    ...h,
    past,
    localeDate: dayFormatter.format(holidayDate),
    weekDay: weekDayFormatter.format(holidayDate)
  }
  nextHoliday = (!nextHoliday && !past) ? out : nextHoliday
  return out
}
)
const daysUntilNext = differenceInDays(new Date(nextHoliday.date), new Date())
document.addEventListener('alpine:init', () => {
  Alpine.store('holidays', {
    next: nextHoliday,
    daysUntilNext,
    holidays
  })
})

const config = {
  selector: '#search',
  placeHolder: 'Search ...',
  data: {

    src: window.ExtentsCat,
    keys: ['name']
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
  const name = feedback.selection.value.name

  console.log(feedback)

  search.input.value = name
})

Alpine.start()
