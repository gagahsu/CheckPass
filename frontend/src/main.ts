import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import DialogService from 'primevue/dialogservice'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import Dialog from 'primevue/dialog'
import Card from 'primevue/card'
import Avatar from 'primevue/avatar'
import Badge from 'primevue/badge'

import 'primeicons/primeicons.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark-mode'
    }
  }
})
app.use(ToastService)
app.use(DialogService)

// Global component registration
app.component('Button', Button)
app.component('InputText', InputText)
app.component('DataTable', DataTable)
app.component('Column', Column)
app.component('Tag', Tag)
app.component('Toast', Toast)
app.component('Dialog', Dialog)
app.component('Card', Card)
app.component('Avatar', Avatar)
app.component('Badge', Badge)

app.mount('#app')
