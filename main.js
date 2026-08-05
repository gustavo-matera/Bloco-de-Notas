const { error } = require("console");
const {app, BrowserWindow, ipcMain, globalShortcut, dialog, Menu, MenuItem} = require("electron");
const fs = require("fs");
const _path = require('path');

let window = null;

const menu = new Menu()

// The first submenu needs to be the app menu on macOS
if (process.platform === 'darwin') {
  const appMenu = new MenuItem({ role: 'appMenu' });
  menu.append(appMenu);
}

const submenu = Menu.buildFromTemplate([
    {
        label: 'Save',
        click: () => window.webContents.send('_save'),
        accelerator: 'CommandOrControl+S'
    },
    {
        label: 'Open',
        click: () => window.webContents.send('_load'),
        accelerator: 'CommandOrControl+O'
    },
    {
        label: 'SaveAs',
        click: () => {
            EditBuffer(currentEntry, {'path':''});
            window.webContents.send('_save');},
        accelerator: 'CommandOrControl+Shift+S'
    }
]);
menu.append(new MenuItem({ label: 'Custom Menu', submenu }));

Menu.setApplicationMenu(menu)

function Entry(id, path, nome, texto){
    this.id = id;
    this.path = path;
    this.nome = nome;
    this.texto = texto;
}

// id do caminho atual
let currentEntry = 0;
// buffer com texto não salvo
let buffer = [];
// ID da próxima aba a ser criada
let nextID = 0;

const GetKeyFromBuffer = (id, key) => {
    for(b of buffer){
        if (b.id === id){
            return b[key];
        }
    }
};
const GetFromBuffer = (id) => {
    for(b of buffer){
        if (b.id === id){
            return b;
        }
    }
};
const AddToBuffer = (newEntry) => {
    buffer.push(newEntry);
    nextID++;
};
const EditBuffer = (id, edit) => {
    for(b of buffer){
        if (b.id == id){
            for(key in edit){
                b[key] = edit[key];
            }
        }
    }
};
const DelFromBuffer = (id) => {
    for(b of buffer){
        if (b.id === id){
            const i = buffer.indexOf(b);
            buffer.splice(i, 1);
            break;
        }
    }
};

const CriaJanela = () => {
    // SETUP================================================================
    window = new BrowserWindow({
        frame: false, transparent: true,
        title: "Bloco de Notas",
        height: 800, width: 800,
        minHeight: 100, minWidth: 300,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            preload: _path.resolve('renderer.js')
        },
        icon: _path.join(__dirname, 'Assets/icons/win/32x32.ico'),
    });
    window.loadFile("index.html");

    // MINIMIZAR JANELA
    ipcMain.on("minimize", () => {
        window.minimize();
    });

    // MAXIMIZAR JANELA
    ipcMain.on("maximize", () => {
        if (window.isMaximized()){
            window.unmaximize();
            return;
        }
        window.maximize()
    });

    // FECHAR JANELA
    ipcMain.on("close", () => {
        window.close();
    });

    // FUNCIONALIDADE========================================================

    // SALVAR ARQUIVO
    ipcMain.on('save', async (_e, txt) => {
        // Se caminho atual abre janela
        if(GetKeyFromBuffer(currentEntry, 'path') === ''){
            const {filePath} = await dialog.showSaveDialog({
                filters: [{name:"Text",
                    extensions:[
                        'txt','js','css','html']}]
            });
            EditBuffer(currentEntry, {'path':filePath})
        }
        // Escreve no arquivo
        const p = GetKeyFromBuffer(currentEntry, 'path');
        fs.writeFileSync(p, txt, 'utf-8');
        // Pega o nome atual importantes
        const split = p.split("\\");
        const nome = split[split.length - 1];
        // Atualiza buffer
        EditBuffer(currentEntry, {'nome':nome});
        window.webContents.send('save', nome, currentEntry);
    });

    // CARREGAR ARQUIVO
    ipcMain.on("load", async () => {// método assíncrono
        // abre explorador e armazena caminho do arquivo
        const {filePaths} = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [{name:"Text",
                extensions:[
                    'txt','js','css','html']}]
            
        });
        const caminho = filePaths[0];
        console.log(caminho);
        const split = caminho.split("\\");
        const nome = split[split.length - 1];

        // Lê arquivo
        const conteudo = fs.readFileSync(caminho, "utf-8");

        // Atualiza currentPath
        const ne = new Entry(nextID, caminho, nome, conteudo);
        AddToBuffer(ne);
        currentEntry = ne.id;
        window.webContents.send('load', nome, conteudo, currentEntry);
    });

    //=================================================================

    // CRIA NOVA ABA
    ipcMain.on('newTab', (_e, texto, titulo) => {
        // Atualiza buffer no id atual
        EditBuffer(currentEntry, {'nome':titulo, 'texto':texto});
        // Cria novo espaço
        const ne = new Entry(nextID, '', `*${nextID}.txt`, '');
        AddToBuffer(ne);
        // Atualiza ID
        currentEntry = ne.id;
        // Lança sinal
        const nome = GetKeyFromBuffer(currentEntry, 'nome');
        window.webContents.send('newTab', currentEntry, nome);
        //console.log(buffer);
    });
    
    // ATUALIZA BUFFER AO TROCAR DE ARQUIVO
    ipcMain.on('update', (_e, val, texto, titulo) => {
        if(currentEntry === val){return}
        // Atualiza buffer do arquivo atual
        EditBuffer(currentEntry, {'nome':titulo, 'texto':texto});
        // Muda currentPath para o novo ID
        currentEntry = val;
        //console.log(`ID Atual: ${currentEntry}`);
        // Atualiza tela
        const b = GetFromBuffer(currentEntry);
        window.webContents.send('update', b.nome, b.texto, currentEntry);
    });

    ipcMain.on('delTab', (_e, id) => {
        // Pega ID da aba fechada
        let pos = buffer.indexOf(GetFromBuffer(id));
        // Se for maior que 0, id volta em 1.
        // Caso seja 0, se mantém
        if(pos > 0){
            pos -= 1;
        }
        // Deleta dados
        DelFromBuffer(id);
        // Se buffer estiver vazio, fecha o aplicativo
        if(buffer.length <= 0){
            window.close();
        }
        // Atualiza Titulo e Texto apenas se a aba fechada for a atual aberta
        if(currentEntry !== id || buffer.length <= 0){return}

        currentEntry = buffer[pos].id;
        const nome = GetKeyFromBuffer(currentEntry, 'nome');
        const texto = GetKeyFromBuffer(currentEntry, 'texto');
        window.webContents.send('update', nome, texto, currentEntry);
    });
}


// Abre a janela quando o aplicativo está pronto
app.whenReady().then(() => {
    CriaJanela();
    setTimeout(Init, 500);
});

const Init = () => {
    let caminho = '';
    let nome = '*.txt';
    let conteudo = '';
    // LÓGICA ((ABRIR COM))
    if(process.argv.length >= 2){
        caminho = process.argv[1];
        const split = caminho.split("\\");
        nome = split[split.length - 1];
        // Lê arquivo
        conteudo = fs.readFileSync(caminho, "utf-8");
    }
    const ne = new Entry(currentEntry, caminho, nome, conteudo);
    AddToBuffer(ne);
    window.webContents.send('f_load', nome, conteudo);
    console.log(buffer);
}