<template>
  <div>
    <button @click="loadTemplate">Carregar Modelo</button>
    <button @click="exportToPDF">Baixar PDF</button>
    <div ref="editor"></div>
  </div>
</template>


<script setup>
import "quill/dist/quill.snow.css";
import "quill-mention/dist/quill.mention.css";
import html2pdf from 'html2pdf.js';

const editor = ref(null);
let quill;

const loadTemplate = () => {
  // Limpar o conteúdo atual do editor
  quill.setContents([]);

  quill.insertEmbed(
    quill.getLength(),
    "nonEditable",
    "Este é um documento oficial. Por favor, preencha as informações abaixo:\n\n"
  );
  quill.insertEmbed(quill.getLength(), "nonEditable", "Nome: ");
  quill.insertText(quill.getLength(), "_________________________\n\n");
  quill.insertEmbed(quill.getLength(), "nonEditable", "Data: ");
  quill.insertText(quill.getLength(), "_________________________\n\n");
  quill.insertEmbed(quill.getLength(), "nonEditable", "Atenciosamente,\n");
  quill.insertEmbed(quill.getLength(), "nonEditable", "Direção da Escola");
  quill.setSelection(quill.getLength() - 1);
};

function mentionSource(searchTerm, renderList, mentionChar) {
  let values;

  const students = [
    { id: 1, value: "Aluno1" },
    { id: 2, value: "Aluno2" },
    { id: 3, value: "Aluno3" },
  ];

  const classes = [
    { id: 1, value: "Aula1" },
    { id: 2, value: "Aula2" },
    { id: 3, value: "Aula3" },
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

const exportToPDF = () => {
  // Obter o conteúdo do editor
  const editorContent = quill.root;

  // Clonar o conteúdo para evitar alterações no editor
  const contentClone = editorContent.cloneNode(true);

  // Injetar estilos necessários
  const style = document.createElement('style');
  style.textContent = `
    .non-editable {
      background-color: #f0f0f0;
      color: #333;
      user-select: none;
      pointer-events: none;
      display: block;
    }
    /* Outros estilos necessários */
  `;
  contentClone.prepend(style);

  // Configurações para o html2pdf
  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5], // Margens em polegadas (topo, esquerda, base, direita)
    filename: 'documento.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, logging: false },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
  };

  // Converter o conteúdo em PDF
  html2pdf().set(opt).from(contentClone).save();
};

onMounted(async () => {
  const { $Quill } = useNuxtApp();

  // Importar módulos do Quill que dependem do DOM
  const BlockEmbed = $Quill.import("blots/block/embed");

  class NonEditableBlot extends BlockEmbed {
    static create(value) {
      let node = super.create();
      node.setAttribute("contenteditable", "false");
      node.setAttribute("data-non-editable", "true");
      node.classList.add("non-editable");
      node.innerHTML = value;
      return node;
    }

    static value(node) {
      return node.innerHTML;
    }
  }

  NonEditableBlot.blotName = "nonEditable";
  NonEditableBlot.tagName = "div";
  NonEditableBlot.className = "non-editable";

  // Registrar o Blot personalizado
  $Quill.register(NonEditableBlot);

  quill = new $Quill(editor.value, {
    theme: "snow",
    modules: {
      toolbar: {
        container: [
          ["bold", "italic", "underline", "strike"], // toggled buttons
          ["blockquote", "code-block"],
          ["link", "image", "video", "formula"],

          [{ header: 1 }, { header: 2 }], // custom button values
          [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
          [{ script: "sub" }, { script: "super" }], // superscript/subscript
          [{ indent: "-1" }, { indent: "+1" }], // outdent/indent
          [{ direction: "rtl" }], // text direction

          [{ size: ["small", false, "large", "huge"] }], // custom dropdown
          [{ header: [1, 2, 3, 4, 5, 6, false] }],

          [{ color: [] }, { background: [] }], // dropdown with defaults from theme
          [{ font: [] }],
          [{ align: [] }],

          ["clean"],
        ],
        handlers: {
          image: function () {
            const input = document.createElement("input");
            input.setAttribute("type", "file");
            input.setAttribute("accept", "image/*");
            input.click();

            input.onchange = () => {
              const file = input.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const base64Image = e.target.result;
                  const range = quill.getSelection();
                  quill.insertEmbed(range.index, "image", base64Image, "user");
                };
                reader.readAsDataURL(file);
              }
            };
          },
        },
      },
      mention: {
        allowedChars: /^[A-Za-z\s]*$/,
        mentionDenotationChars: ["@"],
        source: mentionSource,
      },
    },
  });

  // Prevenir deleção do Blot não editável
  quill.keyboard.addBinding({ key: "Backspace" }, function (range, context) {
    if (range.index > 0) {
      const [blot] = quill.getLeaf(range.index - 1);
      if (blot instanceof NonEditableBlot) {
        return false;
      }
    }
    return true;
  });

  quill.keyboard.addBinding({ key: "Delete" }, function (range, context) {
    const [blot] = quill.getLeaf(range.index);
    if (blot instanceof NonEditableBlot) {
      return false;
    }
    return true;
  });
});
</script>
