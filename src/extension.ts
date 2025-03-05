import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { IGenrateInfo, IModule, IModuleInfo, ISubmodule } from './interfaces/module.interface';
let moduleInfo!: IModuleInfo | null;
let defaultFolderPath = '';
export function activate(context: vscode.ExtensionContext) {

  // Register the initial command
  // let disposable = vscode.commands.registerCommand('containercodegen', () => {
  //     vscode.window.showInformationMessage('Hello World from containercodegen!');
  // });
  // context.subscriptions.push(disposable);

  // Register the right-click context menu command to open the HTML form
  // disposable = vscode.commands.registerCommand('containercodegen.openHtmlForm', async (uri: vscode.Uri) => {
  //     // Create and show the Webview panel
  //     const panel = vscode.window.createWebviewPanel(
  //         'htmlForm', // Identifies the type of the webview panel
  //         'Input Form', // Title of the webview panel
  //         vscode.ViewColumn.One, // Column to show the webview in
  //         {
  //             enableScripts: true, // Allow JavaScript in webview
  //         }
  //     );

  //     // Set the HTML content of the Webview
  //     panel.webview.html = getWebviewContent();

  //     // Handle messages received from the Webview
  //     panel.webview.onDidReceiveMessage(
  //         (message) => {
  //             switch (message.command) {
  //                 case 'submit':
  //                     const inputData = message.input;
  //                     if (inputData) {
  //                         vscode.window.showInformationMessage(`User input: ${inputData}`);
  //                     } else {
  //                         vscode.window.showInformationMessage('No input provided!');
  //                     }
  //                     break;
  //             }
  //         },
  //         undefined,
  //         context.subscriptions
  //     );
  // });


  let disposable = vscode.commands.registerCommand('rib.gen.container', async () => {
    // Search query
    const searchQuery = '"name": "modules-';  // The text you want to search for
    let moduleFolderPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
    moduleFolderPath = moduleFolderPath.replaceAll("\\", "/") + '/libs/modules';
    const filePattern = '**/modules/**/project.json';  // Pattern to search for files (e.g., all .js files)
    // let findFilesFolderPath = vscode.workspace.workspaceFolders;
    // if(vscode.workspace.workspaceFolders){

    // }
    //let moduleInfo!: IModuleInfo;
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

        // Check if the search query is in the file text
        // if (text.includes(searchQuery)) {
        //   matches++;
        //   console.log(`Found match in file: ${file.fsPath}`);
        // }
      }

      moduleInfo = { modules: modules };
    }
    // if (matches > 0) {
    //     vscode.window.showInformationMessage(`${matches} matches found.`);
    // } else {
    //     vscode.window.showInformationMessage('No matches found.');
    // }





    const panel = vscode.window.createWebviewPanel(
      'containerGenerator', // Identifies the type of the webview. Used internally
      'Container Generator', // Title of the panel
      vscode.ViewColumn.One, // Editor column to show the webview
      {
        enableScripts: true, // Allow JavaScript in the webview
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
            panel.dispose();
            break;
          case 'refresh':
            const data = moduleInfo;
            // Refresh the dropdown
            panel.webview.postMessage({
              command: 'populateddlModule',
              data: moduleInfo
            });
            break;

          case 'submit':

            const genrateInfo: IGenrateInfo = message.data as IGenrateInfo;
            // console.log('Form submitted with data:', genrateInfo);
            //console.log('Command => ' + );
            const command = genrateCommand(genrateInfo);
            console.log('Command => ' + command);

            const terminal = vscode.window.createTerminal({
              name: genrateInfo.genrateType + ' Terminal',
              // You can specify the shellPath and shellArgs, but by default, it uses the system shell
            });

            // // Send the command to the terminal (for example, 'echo' command)
            terminal.sendText(command);

            // // Optionally, open the terminal in the editor (this will make it visible)
            terminal.show();

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
            const workspaceFolders = vscode.workspace.workspaceFolders;
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

function getWebviewContent(): string {
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Input Form</title>
        </head>
        <body>
            <h2>Submit your input:</h2>
            <form id="myForm">
                <label for="inputField">Enter something:</label>
                <input type="text" id="inputField" name="inputField" required>
                <button type="submit">Submit</button>
            </form>

            <script>
                // Prevent default form submission and send data back to the extension
                const form = document.getElementById('myForm');
                form.onsubmit = function(event) {
                    event.preventDefault(); // Prevent default form submission

                    const input = document.getElementById('inputField').value;

                    // Check if input is not empty before sending
                    if (input.trim()) {
                        vscode.postMessage({
                            command: 'submit', // Message command
                            input: input // Send the input field value to the extension
                        });
                    } else {
                        vscode.postMessage({
                            command: 'submit', // Message command
                            input: '' // Send empty if no input is provided
                        });
                    }
                };
            </script>
        </body>
        </html>
    `;
}