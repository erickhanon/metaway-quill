<template>
  <div>
    <button @click="loadTemplate">Carregar Modelo</button>
    <div ref="editor"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useNuxtApp } from '#app';
import 'quill/dist/quill.snow.css';
import 'quill-mention/dist/quill.mention.css';

const editor = ref(null);
let quill;

const loadTemplate = () => {
  const templateContent = [
    { insert: 'Este é um documento oficial. ' },
    { insert: 'Por favor, preencha as informações abaixo:\n\n' },
    { insert: 'Nome: ', attributes: { bold: true } },
    { insert: '_________________________\n' },
    { insert: 'Data: ', attributes: { bold: true } },
    { insert: '_________________________\n\n' },
    { insert: 'Atenciosamente,\n' },
    { insert: 'Direção da Escola', attributes: { nonEditable: true, bold: true } },
  ];

  quill.setContents([]);

  quill.setContents(templateContent);
};

onMounted(async () => {
  const { $Quill } = useNuxtApp();
  const Inline = $Quill.import('blots/inline');

  class NonEditableBlot extends Inline {
    static create(value) {
      let node = super.create();
      node.setAttribute('contenteditable', 'false');
      node.setAttribute('data-non-editable', 'true');
      node.classList.add('non-editable');
      node.innerHTML = value;
      return node;
    }

    static formats(node) {
      return node.innerHTML;
    }
  }

  NonEditableBlot.blotName = 'nonEditable';
  NonEditableBlot.tagName = 'span';
  NonEditableBlot.className = 'non-editable';

  $Quill.register({
    'formats/nonEditable': NonEditableBlot,
  });

  quill = new $Quill(editor.value, {
    theme: 'snow',
    modules: {
      toolbar: {
        container: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ header: 1 }, { header: 2 }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          [{ align: [] }],
          ['image'],
          ['clean'],
        ],
        handlers: {
          image: function () {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();

            input.onchange = () => {
              const file = input.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const base64Image = e.target.result;
                  const range = quill.getSelection();
                  quill.insertEmbed(range.index, 'image', base64Image, 'user');
                };
                reader.readAsDataURL(file);
              }
            };
          },
        },
      },
      mention: {
        allowedChars: /^[A-Za-z\s]*$/,
        mentionDenotationChars: ['@'],
        source: mentionSource,
      },
    },
  });

  // Prevenir edição das partes não editáveis
  quill.root.addEventListener('keydown', function (event) {
    const selection = quill.getSelection();
    if (!selection) return;

    const [blot] = quill.scroll.descendant(NonEditableBlot, selection.index);

    if (blot) {
      event.preventDefault();
    }
  });
});

function mentionSource(searchTerm, renderList, mentionChar) {
  let values;

  const students = [
    { id: 1, value: 'Aluno1' },
    { id: 2, value: 'Aluno2' },
    { id: 3, value: 'Aluno3' },
  ];

  const classes = [
    { id: 1, value: 'Aula1' },
    { id: 2, value: 'Aula2' },
    { id: 3, value: 'Aula3' },
  ];

  // Combinar listas de alunos e aulas
  values = [...students, ...classes];

  if (searchTerm.length === 0) {
    renderList(values, searchTerm);
  } else {
    const matches = values.filter((item) => {
      return item.value.toLowerCase().includes(searchTerm.toLowerCase());
    });
    renderList(matches, searchTerm);
  }
}
</script>

<style scoped>
.non-editable {
  background-color: #f0f0f0;
  color: #333;
}
</style>
