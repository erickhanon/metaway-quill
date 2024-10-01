import Quill from 'quill';
import "quill-mention/autoregister";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('Quill', Quill);
});
