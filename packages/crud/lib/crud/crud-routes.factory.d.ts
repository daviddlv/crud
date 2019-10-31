import { CrudOptions, MergedCrudOptions } from '../interfaces';
export declare class CrudRoutesFactory {
    private target;
    protected options: MergedCrudOptions;
    constructor(target: any, options: CrudOptions);
    static create(target: any, options: CrudOptions): CrudRoutesFactory;
    private readonly targetProto;
    private readonly modelName;
    private readonly modelType;
    private readonly actionsMap;
    private create;
    private mergeOptions;
    private getRoutesSchema;
    private getManyBase;
    private getOneBase;
    private createOneBase;
    private createManyBase;
    private updateOneBase;
    private replaceOneBase;
    private deleteOneBase;
    private canCreateRoute;
    private createRoutes;
    private overrideRoutes;
    private enableRoutes;
    private overrideParsedBodyDecorator;
    private getPrimaryParam;
    private setBaseRouteMeta;
    private setRouteArgs;
    private setRouteArgsTypes;
    private setInterceptors;
    private setDecorators;
    private setAction;
    private setSwaggerOperation;
    private setSwaggerPathParams;
    private setSwaggerQueryParams;
    private setSwaggerResponseOk;
    private routeNameAction;
}