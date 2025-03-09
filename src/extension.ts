import * as vscode from 'vscode';
import * as path from 'path';
import * as ts from 'typescript';
import * as fs from 'fs';
import { IGenrateInfo, IModule, IModuleInfo, IOtherConfigBrowse, ISubmodule } from './interfaces/module.interface';
let moduleInfo!: IModuleInfo | null;
let defaultFolderPath = '';
let terminal: vscode.Terminal | null = null;

export function activate(context: vscode.ExtensionContext) {


  let disposable = vscode.commands.registerCommand('rib.gen.container', async () => {

    const panel = vscode.window.createWebviewPanel(
      'containerGenerator', // Identifies the type of the webview. Used internally
      'RIB Generator', // Title of the panel
      vscode.ViewColumn.One, // Editor column to show the webview
      {
        enableScripts: true, // Allow JavaScript in the webview
        retainContextWhenHidden: true, // Keep WebView alive

      }
    );


    const htmlPath = path.join(context.extensionPath, 'src/webview', 'index.html');
    const htmlContent = require('fs').readFileSync(htmlPath, 'utf-8');

    // Convert the vscode.Uri to a webview-compatible URI string

    panel.webview.html = htmlContent;

    // Search query
    // Create a status bar item (a loader spinner)
    let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(loading~spin) Loading...'; // Use the spin icon as a spinner
    statusBarItem.tooltip = 'Loading...'; // Tooltip for more context
    statusBarItem.command = 'extension.showMoreInfo'; // Optional: command to run when clicked
    statusBarItem.show(); // Hide initially

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









    // Send primary dropdown data to WebView
    panel.webview.postMessage({
      command: 'populateddlModule',
      data: moduleInfo
    });
    statusBarItem.hide(); // Hide the spinner

    panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'panelClose':
            const result = await vscode.window.showInformationMessage(
              'Do you want to Open this file?',
              'Yes',
              'No'
            );
            if (result === 'Yes') {
              panel.dispose();
            }
            break;
          case 'close':
            if (terminal) {
              terminal.dispose();
            }
            panel.dispose();
            break;
          case 'refresh':
            statusBarItem.show(); // Show the spinner
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
            statusBarItem.hide(); // Hide the spinner
            break;
          case 'validation':
            statusBarItem.show();
            vscode.window.showErrorMessage('Please fill in the required fields in the form!');
            statusBarItem.hide();
            break;
          case 'submit':
            statusBarItem.show();
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
            setTimeout(() => {
              statusBarItem.hide();
            }, 3000);
            //panel.dispose();





            // // You can run more commands in the terminal after it has been created
            // terminal.sendText('ng version');

            // // Example of running a more complex command, like a directory listing (works in Unix-like systems)
            // // terminal.sendText('ls');
            // panel.dispose(); // This closes the Webview

            break;
          case 'test':
            const data1 = message.data;
            console.log(data1);
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

              const result = await vscode.window.showInformationMessage(
                'Do you want to Open this file?',
                'Yes',
                'No'
              );
              if (result === 'Yes') {
                statusBarItem.show();
                vscode.window.showTextDocument(document);
                statusBarItem.hide();
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

          case 'BrowseOtherConfigFile':

            const data: IOtherConfigBrowse = message.data as IOtherConfigBrowse;
            const configData = [];
            const otherConfigFileUris = await vscode.window.showOpenDialog({
              canSelectFiles: true,
              canSelectFolders: false,
              openLabel: 'Select a File',
            });

            if (otherConfigFileUris && otherConfigFileUris.length > 0) {
              const selectedFile = otherConfigFileUris[0];  // The user selected a file
              const filePath = selectedFile.fsPath;
              const document = await vscode.workspace.openTextDocument(otherConfigFileUris[0]);


              // const result = await vscode.window.showInformationMessage(
              //   'Do you want to Open this file?',
              //   'Yes',
              //   'No'
              // );
              // if (result === 'Yes') {
              //   statusBarItem.show();
              //   vscode.window.showTextDocument(document);
              //   statusBarItem.hide();
              // }
              if (data.type === 'interface') {
                const interfaceNames = getInterfaceNames(filePath);
                configData.push(...interfaceNames);
              } else {
                const interfaceNames = getClassNames(filePath);
                configData.push(...interfaceNames);
              }
              data.path = filePath;
              data.names = configData;
              // Show the document in a new editor tab
              //vscode.window.showTextDocument(document);
              // Now you can interact with the selected file, e.g., read its contents
              if (configData.length > 0) {
                panel.webview.postMessage({
                  command: 'otherConfigFilePath',
                  data: data

                });
              } else {
                if (data.type === 'interface') {
                  vscode.window.showErrorMessage('The selected files do not have an interface.');
                } else {
                  vscode.window.showErrorMessage('The selected files do not have an class.');
                }

              }



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
              statusBarItem.show();
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
            statusBarItem.hide();
            break;

        }
      },
      undefined,
      context.subscriptions
    );


  });

  const view = vscode.window.createTreeView('myExtension.view', {
    treeDataProvider: new MyViewDataProvider()
  });
  context.subscriptions.push(view);

  context.subscriptions.push(disposable);
  context.subscriptions.push(disposable);
}

// TreeView DataProvider for the sidebar
class MyViewDataProvider implements vscode.TreeDataProvider<MyTreeItem> {
  getTreeItem(element: MyTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: MyTreeItem): Thenable<MyTreeItem[]> {
    return Promise.resolve([new MyTreeItem('Open Generator')]);
  }
}

class MyTreeItem extends vscode.TreeItem {
  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: 'rib.gen.container', // Command to execute on click
      title: 'Open Generator'
    };
  }
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
      if (genrateInfo.isUseOtherConfig) {
        if (genrateInfo.otherconfig) {
          if (genrateInfo.otherconfig.entityInfo.path) {
            command += " --otherconfig.entityInfo.path=" + '"' + genrateInfo.otherconfig.entityInfo.path + '"';
          }
          if (genrateInfo.otherconfig.entityInfo.name) {
            command += " --otherconfig.entityInfo.name=" + genrateInfo.otherconfig.entityInfo.name;
          }

          if (genrateInfo.otherconfig.pEntityInfo.path) {
            command += " --otherconfig.pEntityInfo.path=" + '"' + genrateInfo.otherconfig.pEntityInfo.path + '"';
          }
          if (genrateInfo.otherconfig.pEntityInfo.name) {
            command += " --otherconfig.pEntityInfo.name=" + genrateInfo.otherconfig.pEntityInfo.name;
          }

          if (genrateInfo.otherconfig.completeEntityInfo.path) {
            command += " --otherconfig.completeEntityInfo.path=" + '"' + genrateInfo.otherconfig.completeEntityInfo.path + '"';
          }
          if (genrateInfo.otherconfig.completeEntityInfo.name) {
            command += " --otherconfig.completeEntityInfo.name=" + genrateInfo.otherconfig.completeEntityInfo.name;
          }

          if (genrateInfo.otherconfig.pCompleteEntityInfo.path) {
            command += " --otherconfig.pCompleteEntityInfo.path=" + '"' + genrateInfo.otherconfig.pCompleteEntityInfo.path + '"';
          }
          if (genrateInfo.otherconfig.pCompleteEntityInfo.name) {
            command += " --otherconfig.completeEntityInfo.name=" + genrateInfo.otherconfig.pCompleteEntityInfo.name;
          }

          if (genrateInfo.otherconfig.parentDataServiceInfo.path) {
            command += " --otherconfig.parentDataServiceInfo.path=" + '"' + genrateInfo.otherconfig.parentDataServiceInfo.path + '"';
          }
          if (genrateInfo.otherconfig.parentDataServiceInfo.name) {
            command += " --otherconfig.parentDataServiceInfo.name=" + genrateInfo.otherconfig.parentDataServiceInfo.name;
          }

          if (genrateInfo.otherconfig.dto) {
            command += " --otherconfig.dto=" + genrateInfo.otherconfig.dto;
          }

          if (genrateInfo.otherconfig.apiUrl) {
            command += " --otherconfig.apiUrl=" + genrateInfo.otherconfig.apiUrl;
          }

          if (genrateInfo.otherconfig.endPoint) {
            command += " --otherconfig.endPoint=" + genrateInfo.otherconfig.endPoint;
          }

          if (genrateInfo.otherconfig.usePost) {
            command += " --otherconfig.usePost=" + genrateInfo.otherconfig.usePost;
          }

          if (genrateInfo.otherconfig.itemName) {
            command += " --otherconfig.itemName=" + genrateInfo.otherconfig.itemName;
          }
        }
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

