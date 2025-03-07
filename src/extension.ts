import * as vscode from 'vscode';
import * as path from 'path';
import * as ts from 'typescript';
import * as fs from 'fs';
import { IGenrateInfo, IModule, IModuleInfo, ISubmodule } from './interfaces/module.interface';
let moduleInfo!: IModuleInfo | null;
let defaultFolderPath = '';
let terminal: vscode.Terminal | null = null;

export function activate(context: vscode.ExtensionContext) {


  let disposable = vscode.commands.registerCommand('rib.gen.container', async () => {
    // Search query
    const searchQuery = '"name": "modules-';  // The text you want to search for
    let moduleFolderPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
    moduleFolderPath = moduleFolderPath.replaceAll("\\", "/") + '/libs/modules';
    const filePattern = '**/modules/**/project.json';  // Pattern to search for files (e.g., all .js files)
    // let findFilesFolderPath = vscode.workspace.workspaceFolders;
    // if(vscode.workspace.workspaceFolders){

    // }

    let modules: IModule[] = [];
    let submodule: ISubmodule[] = [];
    // Use findFiles to get all files matching the pattern
    const files = await vscode.workspace.findFiles(filePattern, '', 0);
    const dataCount = moduleInfo?.modules.length ?? 0;
    if (dataCount < files.length) {




      // Loop through the files and search for the text
      for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const folderPath = path.dirname(file.fsPath);
        const text = document.getText();
        const data: { name: string } = JSON.parse(text);
        let moduledata = data.name.split("-");

        let module = modules.find((x) => x.name === moduledata[1]);
        if (module) {
          let subModule = module.submodule.find((x) => x.name === moduledata[2]);
          if (!subModule) {
            module.submodule.push({
              id: moduledata[2],
              name: data.name,
              path: folderPath + "\\src\\lib"
            });
          }

        } else {
          let moduleobj: IModule = {
            id: moduledata[1],
            name: moduledata[1],
            submodule: [
              {
                id: moduledata[2],
                name: data.name,
                path: folderPath + "\\src\\lib"
              }
            ]
          };
          modules.push(moduleobj);
        }


      }

      moduleInfo = { modules: modules };
    }





    const panel = vscode.window.createWebviewPanel(
      'containerGenerator', // Identifies the type of the webview. Used internally
      'Container Generator', // Title of the panel
      vscode.ViewColumn.One, // Editor column to show the webview
      {
        enableScripts: true, // Allow JavaScript in the webview
        retainContextWhenHidden: true, // Keep WebView alive
      }
    );


    const htmlPath = path.join(context.extensionPath, 'src/webview', 'index.html');
    const htmlContent = require('fs').readFileSync(htmlPath, 'utf-8');

    panel.webview.html = htmlContent;



    // Send primary dropdown data to WebView
    panel.webview.postMessage({
      command: 'populateddlModule',
      data: moduleInfo
    });


    panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'close':
            if (terminal) {
              terminal.dispose();
            }
            panel.dispose();
            break;
          case 'refresh':
            let modules: IModule[] = [];
            let submodule: ISubmodule[] = [];
            // Use findFiles to get all files matching the pattern
            const files = await vscode.workspace.findFiles(filePattern, '', 0);
            const dataCount = moduleInfo?.modules.length ?? 0;
            if (dataCount < files.length) {




              // Loop through the files and search for the text
              for (const file of files) {
                const document = await vscode.workspace.openTextDocument(file);
                const folderPath = path.dirname(file.fsPath);
                const text = document.getText();
                const data: { name: string } = JSON.parse(text);
                let moduledata = data.name.split("-");

                let module = modules.find((x) => x.name === moduledata[1]);
                if (module) {
                  let subModule = module.submodule.find((x) => x.name === moduledata[2]);
                  if (!subModule) {
                    module.submodule.push({
                      id: moduledata[2],
                      name: data.name,
                      path: folderPath + "\\src\\lib"
                    });
                  }

                } else {
                  let moduleobj: IModule = {
                    id: moduledata[1],
                    name: moduledata[1],
                    submodule: [
                      {
                        id: moduledata[2],
                        name: data.name,
                        path: folderPath + "\\src\\lib"
                      }
                    ]
                  };
                  modules.push(moduleobj);
                }


              }

              moduleInfo = { modules: modules };
            }
            // Refresh the dropdown
            panel.webview.postMessage({
              command: 'populateddlModule',
              data: moduleInfo
            });
            break;
          case 'validation':
            vscode.window.showErrorMessage('Please fill in the required fields in the form!');
            break;
          case 'submit':

            const genrateInfo: IGenrateInfo = message.data as IGenrateInfo;
            // console.log('Form submitted with data:', genrateInfo);
            //console.log('Command => ' + );
            const command = genrateCommand(genrateInfo);
            // console.log('Command => ' + command);
            if (!terminal) {
              terminal = vscode.window.createTerminal({
                name: 'RIB Generator Terminal',
                // You can specify the shellPath and shellArgs, but by default, it uses the system shell
              });

              // // Send the command to the terminal (for example, 'echo' command)
              terminal.sendText(command);

              // // Optionally, open the terminal in the editor (this will make it visible)
              terminal.show();
            } else {

              // // Send the command to the terminal (for example, 'echo' command)
              terminal.sendText(command);
              terminal.show();
            }



            panel.webview.postMessage({
              command: 'reset'

            });

            //panel.dispose();





            // // You can run more commands in the terminal after it has been created
            // terminal.sendText('ng version');

            // // Example of running a more complex command, like a directory listing (works in Unix-like systems)
            // // terminal.sendText('ls');
            // panel.dispose(); // This closes the Webview

            break;
          case 'Browsei18nFile':
            const fileUris = await vscode.window.showOpenDialog({
              canSelectFiles: true,
              canSelectFolders: false,
              openLabel: 'Select a File',
            });

            if (fileUris && fileUris.length > 0) {
              const selectedFile = fileUris[0];  // The user selected a file
              const filePath = selectedFile.fsPath;
              const document = await vscode.workspace.openTextDocument(fileUris[0]);
              // const result = await vscode.window.showQuickPick(
              //   ['Yes', 'No'],
              //   {
              //     placeHolder: 'Do you want to Open this file?',
              //   }
              // );
              const result = await vscode.window.showInformationMessage(
                'Do you want to Open this file?',
                'Yes',
                'No'
              );
              if (result === 'Yes') {
                vscode.window.showTextDocument(document);
              }

              // Show the document in a new editor tab
              //vscode.window.showTextDocument(document);
              // Now you can interact with the selected file, e.g., read its contents
              panel.webview.postMessage({
                command: 'i18nFilePath',
                data: filePath
              });

            } else {
              vscode.window.showInformationMessage('No file selected');
            }
            break;

          case 'browseFolderPath':
            // Get the current workspace folder(s)
            defaultFolderPath = message.data as string;
            const folderPath = 'file:///' + message.data as string;
            const defaultPath = vscode.Uri.parse(folderPath.replaceAll('\\', '/'));

            if (defaultPath) {
              //const workspaceUri = workspaceFolders[0].uri;
              const folderUris = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                openLabel: 'Select a Folder',
                defaultUri: defaultPath
              });

              if (folderUris && folderUris.length > 0) {
                const selectedFile = folderUris[0];  // The user selected a file
                const folderPath = selectedFile.path;

                // Now you can interact with the selected file, e.g., read its contents
                panel.webview.postMessage({
                  command: 'FolderPath',
                  data: folderPath.replace('/', '').replaceAll('/', '\\')
                });

              } else {
                vscode.window.showInformationMessage('No file selected');
              }
            }
            break;

        }
      },
      undefined,
      context.subscriptions
    );


  });



  context.subscriptions.push(disposable);
  context.subscriptions.push(disposable);
}

function genrateCommand(genrateInfo: IGenrateInfo): string {
  if (genrateInfo.browseFolderPath) {
    genrateInfo.browseFolderPath = path.relative(defaultFolderPath, genrateInfo.browseFolderPath);
  }
  let command = 'nx g @rib-4.0/ng-schematics:';
  switch (genrateInfo.genrateType) {
    case 'preload-module':
      command += 'preload-module';
      command += ' --name=modules/' + genrateInfo.name + '/preload';
      break;
    case 'content-module':
      command += 'content-module';
      command += ' --name=modules/' + genrateInfo.module + '/' + genrateInfo.name;
      if (genrateInfo.i18FilePath) {
        command += " --i18n=" + genrateInfo.i18FilePath;
      }
      break;
    case 'entity-genrator':
      command += 'entity';
      if (genrateInfo.gridName) {
        command += " --gridController=" + genrateInfo.gridName;
      }
      if (genrateInfo.gridTitle) {
        command += " --gridTitle=" + genrateInfo.gridTitle;
      }
      if (genrateInfo.formTitle) {
        command += " --formTitle=" + genrateInfo.formTitle;
      }
      if (genrateInfo.formTitle) {
        command += " --formTitle=" + genrateInfo.formTitle;
      }
      if (genrateInfo.gridUuid) {
        command += " --gridUuid=" + genrateInfo.gridUuid;
      }
      if (genrateInfo.formUuid) {
        command += " --formUuid=" + genrateInfo.formUuid;
      }
      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --project=" + genrateInfo.subModule;
      }
      if (genrateInfo.entityType) {
        command += " --entityType=" + genrateInfo.entityType;
      }
      break;
    case 'component-genrator':
      command += 'component';
      if (genrateInfo.name) {
        command += " " + genrateInfo.name;
      }
      if (genrateInfo.styleType) {
        command += " --style=" + genrateInfo.styleType;
      }
      if (genrateInfo.isGenrateStoryBookComponent) {
        command += " --nostory=" + genrateInfo.isGenrateStoryBookComponent;
      }
      if (genrateInfo.browseFolderPath) {

        command += " --path=" + genrateInfo.browseFolderPath;
      }

      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --project=" + genrateInfo.subModule;
      }

      break;
    case 'container-genrator':
      command += 'container';
      if (genrateInfo.name) {
        command += " " + genrateInfo.name;
      }
      if (genrateInfo.styleType) {
        command += " --style=" + genrateInfo.styleType;
      }
      if (genrateInfo.isGenrateStoryBookComponent) {
        command += " --nostory=" + genrateInfo.isGenrateStoryBookComponent;
      }
      if (genrateInfo.browseFolderPath) {
        command += " --path=" + genrateInfo.browseFolderPath;
      }

      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --project=" + genrateInfo.subModule;
      }

      break;

    case 'class-genrator':
      command += 'class';
      if (genrateInfo.name) {
        command += " " + genrateInfo.name;
      }

      if (genrateInfo.browseFolderPath) {
        command += " --path=" + genrateInfo.browseFolderPath;
      }

      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --project=" + genrateInfo.subModule;
      }

      break;
    case 'enum-genrator':
      command += 'enum';
      if (genrateInfo.name) {
        command += " " + genrateInfo.name;
      }

      if (genrateInfo.browseFolderPath) {
        command += " --path=" + genrateInfo.browseFolderPath;
      }

      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --project=" + genrateInfo.subModule;
      }

      break;
    case 'interface-genrator':
      command += 'interface';
      if (genrateInfo.name) {
        command += " " + genrateInfo.name;
      }

      if (genrateInfo.browseFolderPath) {
        command += " --path=" + genrateInfo.browseFolderPath;
      }

      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --project=" + genrateInfo.subModule;
      }

      break;
    case 'pipe-genrator':
      command += 'pipe';
      if (genrateInfo.name) {
        command += " " + genrateInfo.name;
      }

      if (genrateInfo.browseFolderPath) {
        command += " --path=" + genrateInfo.browseFolderPath;
      }

      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --project=" + genrateInfo.subModule;
      }

      break;
    case 'service-genrator':
      command += 'service';
      if (genrateInfo.name) {
        command += " " + genrateInfo.name;
      }

      if (genrateInfo.browseFolderPath) {
        command += " --path=" + genrateInfo.browseFolderPath;
      }

      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --project=" + genrateInfo.subModule;
      }

      break;
    case 'translation-entity-genrator':
      command += 'translation-entity';
      if (genrateInfo.uuid) {
        command += " --uuid=" + genrateInfo.uuid;
      }


      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --project=" + genrateInfo.subModule;
      }

      break;
    case 'auxiliary-module-genrator':
      command += 'auxiliary-module';

      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --name=" + genrateInfo.subModule;
      }

      if (genrateInfo.i18FilePath) {
        command += " --i18n=" + genrateInfo.i18FilePath;
      }

      break;

    case 'characteristics-entity-genrator':
      command += 'characteristics-entity';
      if (genrateInfo.name) {
        command += " --name=" + genrateInfo.name;
      }
      if (genrateInfo.uuid) {
        command += " --uuid=" + genrateInfo.uuid;
      }
      if (genrateInfo.permission) {
        command += " --permission=" + genrateInfo.permission;
      }
      if (genrateInfo.pKey1Field) {
        command += " --pKey1Field=" + genrateInfo.pKey1Field;
      }
      if (genrateInfo.sectionId) {
        command += " --sectionId=" + genrateInfo.sectionId;
      }

      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --project=" + genrateInfo.subModule;
      }

      break;
    case 'pdf-viewer-container-genrator':
      command += 'pdf-viewer-container';
      if (genrateInfo.uuid) {
        command += " --uuid=" + genrateInfo.uuid;
      }


      if (genrateInfo.module && genrateInfo.subModule) {
        command += " --project=" + genrateInfo.subModule;
      }

      break;

  }
  return command;
}
export function deactivate() {

  moduleInfo = null;
}

function getClassNames(filePath: string): string[] {
  // Read the content of the TypeScript file
  const sourceCode = fs.readFileSync(filePath, 'utf8');

  // Parse the TypeScript code into an AST
  const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

  // Array to store the class names
  const classNames: string[] = [];

  // Function to traverse the AST and find classes
  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node)) {
      // If it's a class declaration, push the name to the array
      if (node.name) {
        classNames.push(node.name.text);
      }
    }

    // Visit all the child nodes
    ts.forEachChild(node, visit);
  }

  // Start traversing from the root node
  visit(sourceFile);

  return classNames;
}

function getInterfaceNames(filePath: string): string[] {
  // Read the content of the TypeScript file
  const fs = require('fs');
  const sourceCode = fs.readFileSync(filePath, 'utf8');

  // Parse the TypeScript code into an AST
  const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

  // Array to store the interface names
  const interfaceNames: string[] = [];

  // Function to traverse the AST and find interfaces
  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node)) {
      // If it's an interface declaration, push the name to the array
      interfaceNames.push(node.name.text);
    }

    // Visit all the child nodes
    ts.forEachChild(node, visit);
  }

  // Start traversing from the root node
  visit(sourceFile);

  return interfaceNames;
}

