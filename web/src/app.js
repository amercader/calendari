import Alpine from 'alpinejs'
import autoComplete from '@tarekraafat/autocomplete.js'

window.Alpine = Alpine

const festes = [
  { date: '2023-01-06', name: 'Reis', ambit: 'Catalunya' },
  { date: '2023-04-07', name: 'Divendres Sant', ambit: 'Espanya' },
  { date: '2023-04-10', name: 'Pasqua Florida', ambit: 'Catalunya' },
  { date: '2023-05-01', name: 'Festa del Treball', ambit: 'Espanya' },
  { date: '2023-06-24', name: 'Sant Joan', ambit: 'Catalunya' },
  { date: '2023-08-15', name: "L'Assumpció", ambit: 'Espanya' },
  { date: '2023-09-11', name: 'Diada Nacional de Catalunya', ambit: 'Catalunya' },
  { date: '2023-10-12', name: "Festa Nacional d'Espanya", ambit: 'Espanya' },
  { date: '2023-11-01', name: 'Tots Sants', ambit: 'Espanya' },
  { date: '2023-12-06', name: 'Dia de la Constitució', ambit: 'Espanya' },
  { date: '2023-12-08', name: 'La Immaculada', ambit: 'Espanya' },
  { date: '2023-12-25', name: 'Nadal', ambit: 'Espanya' },
  { date: '2023-12-26', name: 'Sant Esteve', ambit: 'Catalunya' }
]

const nextHoliday = festes[1].date
const date = new Date(nextHoliday)

// request a weekday along with a long date
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
console.log(new Intl.DateTimeFormat('ca', options).format(date))

console.log(nextHoliday)
document.addEventListener('alpine:init', () => {
  Alpine.store('holidays', {
    next: nextHoliday
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
const search = new autoComplete(config)

search.input.addEventListener('selection', function (event) {
  const feedback = event.detail
  search.input.blur()
  const name = feedback.selection.value.name

  console.log(feedback)

  search.input.value = name
})

Alpine.start()
