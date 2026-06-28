import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue'),
    },
    {
      path: '/patients',
      name: 'PatientList',
      component: () => import('../views/patient/PatientList.vue'),
    },
    {
      path: '/patients/add',
      name: 'PatientAdd',
      component: () => import('../views/patient/PatientForm.vue'),
    },
    {
      path: '/patients/:id',
      name: 'PatientDetail',
      component: () => import('../views/patient/PatientDetail.vue'),
    },
    {
      path: '/patients/:id/edit',
      name: 'PatientEdit',
      component: () => import('../views/patient/PatientForm.vue'),
    },
    {
      path: '/patients/:patientId/vitals',
      name: 'VitalsForm',
      component: () => import('../views/vitals/VitalsForm.vue'),
    },
    {
      path: '/medicines',
      name: 'MedicineList',
      component: () => import('../views/medicine/MedicineList.vue'),
    },
    {
      path: '/medicines/add',
      name: 'MedicineAdd',
      component: () => import('../views/medicine/MedicineForm.vue'),
    },
    {
      path: '/medicines/:id/edit',
      name: 'MedicineEdit',
      component: () => import('../views/medicine/MedicineForm.vue'),
    },
    {
      path: '/dose',
      name: 'DoseDashboard',
      component: () => import('../views/dose/DoseDashboard.vue'),
    },
    {
      path: '/data',
      name: 'DataManager',
      component: () => import('../views/settings/DataManager.vue'),
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('../views/About.vue'),
    },
  ],
})

export default router
