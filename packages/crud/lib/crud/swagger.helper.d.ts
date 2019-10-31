import { HttpStatus } from '@nestjs/common';
import { ParamsOptions } from '../interfaces';
import { BaseRouteName } from '../types';
export declare const swaggerPkg: any;
export declare class Swagger {
    static operationsMap(modelName: any): {
        [key in BaseRouteName]: string;
    };
    static setOperation(metadata: any, func: Function): void;
    static setParams(metadata: any, func: Function): void;
    static setResponseOk(metadata: any, func: Function): void;
    static getOperation(func: Function): any;
    static getParams(func: Function): any[];
    static getResponseOk(func: Function): any;
    static createResponseOkMeta(status: HttpStatus, isArray: boolean, dto: any): any;
    static createPathParasmMeta(options: ParamsOptions): any[];
    static createQueryParamsMeta(name: BaseRouteName): {
        name: any;
        description: string;
        required: boolean;
        in: string;
        type: string;
    }[];
    static getQueryParamsNames(): {
        delim: string;
        delimStr: string;
        fields: any;
        filter: any;
        or: any;
        join: any;
        sort: any;
        limit: any;
        offset: any;
        page: any;
        cache: any;
    };
}
