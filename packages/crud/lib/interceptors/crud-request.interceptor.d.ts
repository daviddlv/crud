import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { RequestQueryParser } from '@nestjsx/crud-request';
import { MergedCrudOptions, CrudRequest, AuthOptions } from '../interfaces';
export declare class CrudRequestInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): import("rxjs").Observable<any>;
    getCrudOptions(controllerOptions: MergedCrudOptions): Partial<MergedCrudOptions>;
    getCrudRequest(parser: RequestQueryParser, crudOptions: Partial<MergedCrudOptions>): CrudRequest;
    handleAuthorized(req: any, authOptions: AuthOptions, parser: RequestQueryParser): void;
}
