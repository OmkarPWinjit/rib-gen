export interface IModuleInfo {
    modules: IModule[]
}

export interface IModule {
    id: string
    name: string
    submodule: ISubmodule[]
}

export interface ISubmodule {
    id: string
    name: string
    path: string
}

export interface IGenrateInfo {

    genrateType: string;
    name: string;
    i18FilePath: string;
    styleType: string;
    isGenrateStoryBookComponent: boolean;
    browseFolderPath: string;
    uuid: string;
    permission: string;
    pKey1Field: string;
    sectionId: string;
    gridTitle: string;
    gridName: string;
    gridUuid: string;
    formTitle: string;
    formUuid: string;
    module: string;
    subModule: string
    entityType: string;
}