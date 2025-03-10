
//IModuleInfo Interface 
export interface IModuleInfo {
    modules: IModule[]
}

// IModule Interface
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
    isUseOtherConfig: boolean;
    otherconfig?: IOtherconfig;
}
export interface IOtherconfig {
    entityInfo: IEntityInfo;
    completeEntityInfo: IEntityInfo;
    pEntityInfo: IEntityInfo;
    pCompleteEntityInfo: IEntityInfo;
    parentDataServiceInfo: IEntityInfo;
    dto: string;
    apiUrl: string;
    endPoint: string;
    usePost: boolean;
    deleteEndPoint?: string;
    itemName: string;
}
export interface IEntityInfo {
    name: string;
    path: string
}

export interface IOtherConfigBrowse {
    id?: string;
    type?: string;
    names?: string[];
    path?: string;
}

export enum BrowseFileType {
    JSON = "JSON",
    Interface = "Interface",
    Class = 'Class',
    XML = "XML",
    CSV = "CSV",
    EXCEL = "EXCEL",
    DB = "DB",
    API = "API",
    OTHER = "OTHER"
}
