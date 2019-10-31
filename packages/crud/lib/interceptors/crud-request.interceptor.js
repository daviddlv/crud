"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const crud_request_1 = require("@nestjsx/crud-request");
const util_1 = require("@nestjsx/util");
const constants_1 = require("../constants");
const reflection_helper_1 = require("../crud/reflection.helper");
let CrudRequestInterceptor = class CrudRequestInterceptor {
    intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        if (!req[constants_1.PARSED_CRUD_REQUEST_KEY]) {
            const ctrl = context.getClass();
            const ctrlOptions = reflection_helper_1.R.getCrudOptions(ctrl);
            const crudOptions = this.getCrudOptions(ctrlOptions);
            const parser = crud_request_1.RequestQueryParser.create();
            parser.parseQuery(req.query);
            if (!util_1.isNil(ctrlOptions)) {
                parser.parseParams(req.params, crudOptions.params);
                this.handleAuthorized(req, crudOptions.auth, parser);
            }
            req[constants_1.PARSED_CRUD_REQUEST_KEY] = this.getCrudRequest(parser, crudOptions);
        }
        return next.handle();
    }
    getCrudOptions(controllerOptions) {
        return controllerOptions
            ? controllerOptions
            : {
                query: {},
                routes: {},
                params: {},
            };
    }
    getCrudRequest(parser, crudOptions) {
        const parsed = parser.getParsed();
        const { query, routes, params } = crudOptions;
        return {
            parsed,
            options: {
                query,
                routes,
                params,
            },
        };
    }
    handleAuthorized(req, authOptions, parser) {
        if (util_1.isObject(authOptions)) {
            const hasFilter = util_1.isFunction(authOptions.filter);
            const hasPersist = util_1.isFunction(authOptions.persist);
            if (hasFilter || hasPersist) {
                const { method } = req;
                const userOrRequest = authOptions.property ? req[authOptions.property] : req;
                if (util_1.isIn(method, ['GET', 'PATCH', 'PUT', 'DELETE']) && hasFilter) {
                    parser.setAuthFilter(authOptions.filter(userOrRequest));
                }
                if (util_1.isIn(method, ['PATCH', 'PUT', 'POST']) && hasPersist) {
                    parser.setAuthPersist(authOptions.persist(userOrRequest));
                }
            }
        }
    }
};
CrudRequestInterceptor = __decorate([
    common_1.Injectable()
], CrudRequestInterceptor);
exports.CrudRequestInterceptor = CrudRequestInterceptor;
//# sourceMappingURL=crud-request.interceptor.js.map