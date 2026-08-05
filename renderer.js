const {ipcRenderer} = require("electron");


const texto = document.getElementById('input');
const titulo = document.getElementById("drag");
let posClose = 75;

//=========BOTÕES DA JANELA==================

// Minimizar
document.getElementById("min").addEventListener("click", () => {
    ipcRenderer.send("minimize");
});
// Maximizar
document.getElementById("max").addEventListener("click", () => {
    ipcRenderer.send("maximize");
});
// Fechar
document.getElementById("close").addEventListener("click", () => {
    ipcRenderer.send("close");
});


//==========BOTÕES DO MENU====================

// Carregar
ipcRenderer.on('_load', () => {
    ipcRenderer.send("load");
});
document.getElementById("load").addEventListener("click", () => {
    ipcRenderer.send("load");
});
ipcRenderer.on('f_load', (_e, nome, conteudo) => {
    titulo.innerHTML = nome;
    texto.value = conteudo;
    document.getElementById(0).innerHTML = nome;
});
ipcRenderer.on('load', (_e, nome, conteudo, id) => {
    titulo.innerHTML = nome;
    texto.value = conteudo;
    CreateButton(id);
    document.getElementById(`${id}`).innerHTML = nome;
});

// Salvar
ipcRenderer.on('_save', () => {
    ipcRenderer.send("save", texto.value);
});
document.getElementById("save").addEventListener("click", () => {
    ipcRenderer.send("save", texto.value);
});
ipcRenderer.on('save', (_e, nome, id) => {
    titulo.innerHTML = nome;
    document.getElementById(`${id}`).innerHTML = nome;
});

//==============GUIAS==================

// Criar nova aba
document.getElementById('new').addEventListener('click', () => {
    ipcRenderer.send('newTab', texto.value, titulo.innerHTML);
});
ipcRenderer.on('newTab', (_e, id, nome) => {
    titulo.innerHTML = nome;
    texto.value = "";
    CreateButton(id);
});


const CreateButton = (val) => {
    // Cria botão
    document.getElementById('new').insertAdjacentHTML(
        'beforebegin', `<button class="Enter" id="${val}">*${val}.txt</button>
        <button class="closeTab" id="close${val}" style="top:${posClose}px">X</button>`
    );
    const btn = document.getElementById(val);

    btn.addEventListener('animationend', () => {
        btn.classList.remove('Enter');
        ConectaBTN(val);
        FocoBTN(btn);
    });
    // Atualiza a próxima posição do botão fechar guia
    posClose += 60;
};
    
const ConectaBTN = (val) => {
    const btn = document.getElementById(`${val}`);
    btn.addEventListener("click", () => {
        ipcRenderer.send("update", val, texto.value, titulo.innerHTML);
    });
    // Conecta sub-botão de fechar
    const del = document.getElementById(`close${val}`);
    del.addEventListener("click", () => {
        posClose -= 60;
        btn.remove();
        del.remove();

        const cTabs = document.getElementsByClassName('closeTab');
        //if(cTabs.length <= 0){return}

        let pseudoPos = 15;
        for(let c of cTabs){
            c.style.top = `${pseudoPos}px`; 
            pseudoPos += 60;
        }
        ipcRenderer.send('delTab', val);
        texto.focus();
    });
}
    
ConectaBTN(0);

ipcRenderer.on('update', (_e, nome, txt, id) => {
    titulo.innerHTML = nome;
    texto.value = txt;
    const btn = document.getElementById(id);
    if(btn != null){FocoBTN(btn)}
});

// Inclui TAB na textarea (((diretamente do stack overflow)))
document.getElementById('input').addEventListener('keydown', function(e) {
    if (e.key == 'Tab') {
        e.preventDefault();
        var start = this.selectionStart;
        var end = this.selectionEnd;

        // set textarea value to: text before caret + tab + text after caret
        this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);

        // put caret at right position again
        this.selectionStart =
            this.selectionEnd = start + 1;
    }
});

const FocoBTN = (btn) => {
    document.querySelector('.navBtnON')?.classList.remove('navBtnON');
    btn.classList.add('navBtnON');
} 