<template>
  <div>
    <button @click="loadTemplate">Carregar Modelo</button>
    <button @click="showSignaturePad = true">Assinar Documento</button>
    <button @click="exportToPDF">Baixar PDF</button>
    <button @click="quill.setContents([])">Limpar Editor</button>
    <!-- clear editor -->
    <div ref="editor"></div>
  </div>
  <div v-if="showSignaturePad" class="signature-modal">
    <div class="signature-container">
      <canvas ref="signaturePadCanvas"></canvas>
      <div class="signature-buttons">
        <button @click="saveSignature">Salvar Assinatura</button>
        <button @click="clearSignature">Limpar</button>
        <button @click="closeSignaturePad">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import "quill/dist/quill.snow.css";
import "quill-mention/dist/quill.mention.css";
import html2pdf from "html2pdf.js";
import SignaturePad from 'signature_pad';

const editor = ref(null);
const showSignaturePad = ref(false);
const signaturePadCanvas = ref(null);
let quill;
let signaturePad;
let signatureImage = null;

// Função para carregar o modelo
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

// Função para exportar o conteúdo para PDF
const exportToPDF = () => {
  // Obter o conteúdo do editor
  const editorContent = quill.root;
  // Clonar o conteúdo para evitar alterações no editor
  const contentClone = editorContent.cloneNode(true);
  // Injetar estilos necessários
  const style = document.createElement("style");
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

  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5],
    filename: "documento.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, logging: false },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
  };

  // Converter o conteúdo em PDF
  html2pdf().set(opt).from(contentClone).save();
};

// Funções relacionadas ao SignaturePad
const initializeSignaturePad = async () => {
  await nextTick(); // Garante que o DOM foi atualizado
  const canvas = signaturePadCanvas.value;
  if (canvas) {
    // Ajustar o tamanho do canvas conforme necessário
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    signaturePad = new SignaturePad(canvas);
  } else {
    console.error('Canvas do SignaturePad não está disponível.');
  }
};

const saveSignature = () => {
  if (signaturePad.isEmpty()) {
    alert('Por favor, forneça uma assinatura primeiro.');
    return;
  }
  signatureImage = signaturePad.toDataURL();
  showSignaturePad.value = false;

  if (signatureImage) {
    // Inserir a assinatura no editor
    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, 'image', signatureImage, 'user');
    quill.insertText(range.index + 1, '\n', 'user');
  }
};

const clearSignature = () => {
  if (signaturePad) {
    signaturePad.clear();
  }
};

const closeSignaturePad = () => {
  showSignaturePad.value = false;
};

// Observador para inicializar o SignaturePad quando o modal for exibido
watch(showSignaturePad, (newValue) => {
  if (newValue) {
    initializeSignaturePad();
  }
});

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
          ["bold", "italic", "underline", "strike"],
          ["blockquote", "code-block"],
          ["link", "image", "video", "formula"],
          [{ header: 1 }, { header: 2 }],
          [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
          [{ script: "sub" }, { script: "super" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ direction: "rtl" }],
          [{ size: ["small", false, "large", "huge"] }],
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          [{ color: [] }, { background: [] }],
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

<style>
.signature-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

.signature-container {
  position: relative;
  background-color: #fff;
  margin: 5% auto;
  padding: 20px;
  width: 600px;
  max-width: 90%;
  border-radius: 8px;
}

.signature-container canvas {
  border: 1px solid #ccc;
  width: 100%;
  height: 200px; /* Ajuste conforme necessário */
}

.signature-buttons {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
}

.signature-buttons button {
  flex: 1;
  margin: 0 5px;
}
</style>
