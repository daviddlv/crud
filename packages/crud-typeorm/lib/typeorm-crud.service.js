"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crud_1 = require("@nestjsx/crud");
const util_1 = require("@nestjsx/util");
const class_transformer_1 = require("class-transformer");
const typeorm_1 = require("typeorm");
class TypeOrmCrudService extends crud_1.CrudService {
    constructor(repo) {
        super();
        this.repo = repo;
        this.entityColumnsHash = {};
        this.entityRelationsHash = {};
        this.onInitMapEntityColumns();
        this.onInitMapRelations();
    }
    get findOne() {
        return this.repo.findOne.bind(this.repo);
    }
    get find() {
        return this.repo.find.bind(this.repo);
    }
    get count() {
        return this.repo.count.bind(this.repo);
    }
    get entityType() {
        return this.repo.target;
    }
    get alias() {
        return this.repo.metadata.targetName;
    }
    async getMany(req) {
        const { parsed, options } = req;
        const builder = await this.createBuilder(parsed, options);
        if (this.decidePagination(parsed, options)) {
            const [data, total] = await builder.getManyAndCount();
            const limit = builder.expressionMap.take;
            const offset = builder.expressionMap.skip;
            return this.createPageInfo(data, total, limit, offset);
        }
        return builder.getMany();
    }
    async getOne(req) {
        return this.getOneOrFail(req);
    }
    async createOne(req, dto) {
        const entity = this.prepareEntityBeforeSave(dto, req.parsed);
        if (!entity) {
            this.throwBadRequestException(`Empty data. Nothing to save.`);
        }
        return this.repo.save(entity);
    }
    async createMany(req, dto) {
        if (!util_1.isObject(dto) || !util_1.isArrayFull(dto.bulk)) {
            this.throwBadRequestException(`Empty data. Nothing to save.`);
        }
        const bulk = dto.bulk
            .map((one) => this.prepareEntityBeforeSave(one, req.parsed))
            .filter((d) => !util_1.isUndefined(d));
        if (!util_1.hasLength(bulk)) {
            this.throwBadRequestException(`Empty data. Nothing to save.`);
        }
        return this.repo.save(bulk, { chunk: 50 });
    }
    async updateOne(req, dto) {
        const { allowParamsOverride, returnShallow } = req.options.routes.updateOneBase;
        const paramsFilters = this.getParamFilters(req.parsed);
        const authFilter = req.parsed.authFilter || {};
        const authPersist = req.parsed.authPersist || {};
        const toFind = { ...paramsFilters, ...authFilter };
        const found = returnShallow
            ? await this.getOneShallowOrFail(toFind)
            : await this.getOneOrFail(req);
        const toSave = !allowParamsOverride
            ? { ...found, ...dto, ...paramsFilters, ...authPersist }
            : { ...found, ...dto, ...authPersist };
        const updated = await this.repo.save(class_transformer_1.plainToClass(this.entityType, toSave));
        if (returnShallow) {
            return updated;
        }
        else {
            req.parsed.paramsFilter.forEach((filter) => {
                filter.value = updated[filter.field];
            });
            return this.getOneOrFail(req);
        }
    }
    async replaceOne(req, dto) {
        const { allowParamsOverride, returnShallow } = req.options.routes.replaceOneBase;
        const paramsFilters = this.getParamFilters(req.parsed);
        const authPersist = req.parsed.authPersist || {};
        const toSave = !allowParamsOverride
            ? { ...dto, ...paramsFilters, ...authPersist }
            : { ...paramsFilters, ...dto, ...authPersist };
        const replaced = await this.repo.save(class_transformer_1.plainToClass(this.entityType, toSave));
        if (returnShallow) {
            return replaced;
        }
        else {
            req.parsed.paramsFilter.forEach((filter) => {
                filter.value = replaced[filter.field];
            });
            return this.getOneOrFail(req);
        }
    }
    async deleteOne(req) {
        const { returnDeleted } = req.options.routes.deleteOneBase;
        const paramsFilters = this.getParamFilters(req.parsed);
        const authFilter = req.parsed.authFilter || {};
        const toFind = { ...paramsFilters, ...authFilter };
        const found = await this.getOneShallowOrFail(toFind);
        const deleted = await this.repo.remove(found);
        return returnDeleted ? { ...deleted, ...paramsFilters, ...authFilter } : undefined;
    }
    getParamFilters(parsed) {
        let filters = {};
        if (util_1.hasLength(parsed.paramsFilter)) {
            for (const filter of parsed.paramsFilter) {
                filters[filter.field] = filter.value;
            }
        }
        return filters;
    }
    decidePagination(parsed, options) {
        return ((Number.isFinite(parsed.page) || Number.isFinite(parsed.offset)) &&
            !!this.getTake(parsed, options.query));
    }
    async createBuilder(parsed, options, many = true) {
        const builder = this.repo.createQueryBuilder(this.alias);
        const select = this.getSelect(parsed, options.query);
        builder.select(select);
        const defaultSearch = this.getDefaultSearchCondition(options, parsed);
        if (util_1.isNil(parsed.search)) {
            this.setSearchCondition(builder, { $and: defaultSearch });
            const filters = parsed.filter;
            const hasFilter = util_1.isArrayFull(filters);
            const hasOr = util_1.isArrayFull(parsed.or);
            if (hasFilter && hasOr) {
                if (filters.length === 1 && parsed.or.length === 1) {
                    this.setOrWhere(filters[0], `filter0`, builder);
                    this.setOrWhere(parsed.or[0], `or0`, builder);
                }
                else if (filters.length === 1) {
                    this.setAndWhere(filters[0], `filter0`, builder);
                    builder.orWhere(new typeorm_1.Brackets((qb) => {
                        for (let i = 0; i < parsed.or.length; i++) {
                            this.setAndWhere(parsed.or[i], `or${i}`, qb);
                        }
                    }));
                }
                else if (parsed.or.length === 1) {
                    this.setAndWhere(parsed.or[0], `or0`, builder);
                    builder.orWhere(new typeorm_1.Brackets((qb) => {
                        for (let i = 0; i < filters.length; i++) {
                            this.setAndWhere(filters[i], `filter${i}`, qb);
                        }
                    }));
                }
                else {
                    builder.andWhere(new typeorm_1.Brackets((qb) => {
                        for (let i = 0; i < filters.length; i++) {
                            this.setAndWhere(filters[i], `filter${i}`, qb);
                        }
                    }));
                    builder.orWhere(new typeorm_1.Brackets((qb) => {
                        for (let i = 0; i < parsed.or.length; i++) {
                            this.setAndWhere(parsed.or[i], `or${i}`, qb);
                        }
                    }));
                }
            }
            else if (hasOr) {
                for (let i = 0; i < parsed.or.length; i++) {
                    this.setOrWhere(parsed.or[i], `or${i}`, builder);
                }
            }
            else if (hasFilter) {
                for (let i = 0; i < filters.length; i++) {
                    this.setAndWhere(filters[i], `filter${i}`, builder);
                }
            }
        }
        else {
            const search = defaultSearch.length
                ? { $and: [...defaultSearch, parsed.search] }
                : parsed.search;
            this.setSearchCondition(builder, search);
        }
        const joinOptions = options.query.join || {};
        const allowedJoins = util_1.objKeys(joinOptions);
        if (util_1.hasLength(allowedJoins)) {
            const eagerJoins = {};
            for (let i = 0; i < allowedJoins.length; i++) {
                if (joinOptions[allowedJoins[i]].eager) {
                    const cond = parsed.join.find((j) => j && j.field === allowedJoins[i]) || {
                        field: allowedJoins[i],
                    };
                    this.setJoin(cond, joinOptions, builder);
                    eagerJoins[allowedJoins[i]] = true;
                }
            }
            if (util_1.isArrayFull(parsed.join)) {
                for (let i = 0; i < parsed.join.length; i++) {
                    if (!eagerJoins[parsed.join[i].field]) {
                        this.setJoin(parsed.join[i], joinOptions, builder);
                    }
                }
            }
        }
        if (many) {
            const sort = this.getSort(parsed, options.query);
            builder.orderBy(sort);
            const take = this.getTake(parsed, options.query);
            if (isFinite(take)) {
                builder.take(take);
            }
            const skip = this.getSkip(parsed, take);
            if (isFinite(skip)) {
                builder.skip(skip);
            }
        }
        if (options.query.cache && parsed.cache !== 0) {
            builder.cache(builder.getQueryAndParameters(), options.query.cache);
        }
        return builder;
    }
    getDefaultSearchCondition(options, parsed) {
        const filter = this.queryFilterToSearch(options.query.filter);
        const paramsFilter = this.queryFilterToSearch(parsed.paramsFilter);
        const authFilter = this.queryFilterToSearch(parsed.authFilter);
        return [...filter, ...paramsFilter, ...authFilter];
    }
    queryFilterToSearch(filter) {
        return util_1.isArrayFull(filter)
            ? filter.map((item) => ({
                [item.field]: { [item.operator]: item.value },
            }))
            : util_1.isObject(filter)
                ? [filter]
                : [];
    }
    onInitMapEntityColumns() {
        this.entityColumns = this.repo.metadata.columns.map((prop) => {
            if (prop.embeddedMetadata) {
                this.entityColumnsHash[prop.propertyPath] = true;
                return prop.propertyPath;
            }
            this.entityColumnsHash[prop.propertyName] = true;
            return prop.propertyName;
        });
        this.entityPrimaryColumns = this.repo.metadata.columns
            .filter((prop) => prop.isPrimary)
            .map((prop) => prop.propertyName);
    }
    onInitMapRelations() {
        this.entityRelationsHash = this.repo.metadata.relations.reduce((hash, curr) => ({
            ...hash,
            [curr.propertyName]: {
                name: curr.propertyName,
                columns: curr.inverseEntityMetadata.columns.map((col) => col.propertyName),
                primaryColumns: curr.inverseEntityMetadata.primaryColumns.map((col) => col.propertyName),
            },
        }), {});
    }
    async getOneOrFail(req) {
        const { parsed, options } = req;
        const builder = await this.createBuilder(parsed, options);
        const found = await builder.getOne();
        if (!found) {
            this.throwNotFoundException(this.alias);
        }
        return found;
    }
    async getOneShallowOrFail(where) {
        const found = await this.findOne({ where });
        if (!found) {
            this.throwNotFoundException(this.alias);
        }
        return found;
    }
    prepareEntityBeforeSave(dto, parsed) {
        if (!util_1.isObject(dto)) {
            return undefined;
        }
        if (util_1.hasLength(parsed.paramsFilter)) {
            for (const filter of parsed.paramsFilter) {
                dto[filter.field] = filter.value;
            }
        }
        const authPersist = util_1.isObject(parsed.authPersist) ? parsed.authPersist : {};
        if (!util_1.hasLength(util_1.objKeys(dto))) {
            return undefined;
        }
        return dto instanceof this.entityType
            ? Object.assign(dto, authPersist)
            : class_transformer_1.plainToClass(this.entityType, { ...dto, ...authPersist });
    }
    getAllowedColumns(columns, options) {
        return (!options.exclude || !options.exclude.length) &&
            (!options.allow || !options.allow.length)
            ? columns
            : columns.filter((column) => (options.exclude && options.exclude.length
                ? !options.exclude.some((col) => col === column)
                : true) &&
                (options.allow && options.allow.length
                    ? options.allow.some((col) => col === column)
                    : true));
    }
    getRelationMetadata(field) {
        try {
            const fields = field.split('.');
            const target = fields[fields.length - 1];
            const paths = fields.slice(0, fields.length - 1);
            let relations = this.repo.metadata.relations;
            for (const propertyName of paths) {
                relations = relations.find((o) => o.propertyName === propertyName)
                    .inverseEntityMetadata.relations;
            }
            const relation = relations.find((o) => o.propertyName === target);
            relation.nestedRelation = `${fields[fields.length - 2]}.${target}`;
            return relation;
        }
        catch (e) {
            return null;
        }
    }
    setJoin(cond, joinOptions, builder) {
        if (this.entityRelationsHash[cond.field] === undefined && cond.field.includes('.')) {
            const curr = this.getRelationMetadata(cond.field);
            if (!curr) {
                this.entityRelationsHash[cond.field] = null;
                return true;
            }
            this.entityRelationsHash[cond.field] = {
                name: curr.propertyName,
                columns: curr.inverseEntityMetadata.columns.map((col) => col.propertyName),
                primaryColumns: curr.inverseEntityMetadata.primaryColumns.map((col) => col.propertyName),
                nestedRelation: curr.nestedRelation,
            };
        }
        if (cond.field && this.entityRelationsHash[cond.field] && joinOptions[cond.field]) {
            const relation = this.entityRelationsHash[cond.field];
            const options = joinOptions[cond.field];
            const allowed = this.getAllowedColumns(relation.columns, options);
            if (!allowed.length) {
                return true;
            }
            const alias = options.alias ? options.alias : relation.name;
            const columns = !cond.select || !cond.select.length
                ? allowed
                : cond.select.filter((col) => allowed.some((a) => a === col));
            const select = [
                ...relation.primaryColumns,
                ...(options.persist && options.persist.length ? options.persist : []),
                ...columns,
            ].map((col) => `${alias}.${col}`);
            const relationPath = relation.nestedRelation || `${this.alias}.${relation.name}`;
            const relationType = options.required ? 'innerJoin' : 'leftJoin';
            builder[relationType](relationPath, alias);
            builder.addSelect(select);
        }
        return true;
    }
    setAndWhere(cond, i, builder) {
        const { str, params } = this.mapOperatorsToQuery(cond, `andWhere${i}`);
        builder.andWhere(str, params);
    }
    setOrWhere(cond, i, builder) {
        const { str, params } = this.mapOperatorsToQuery(cond, `orWhere${i}`);
        builder.orWhere(str, params);
    }
    setSearchCondition(builder, search, condition = '$and') {
        if (util_1.isObject(search)) {
            const keys = util_1.objKeys(search);
            if (keys.length) {
                if (util_1.isArrayFull(search.$and)) {
                    if (search.$and.length === 1) {
                        this.setSearchCondition(builder, search.$and[0], condition);
                    }
                    else {
                        this.builderAddBrackets(builder, condition, new typeorm_1.Brackets((qb) => {
                            search.$and.forEach((item) => {
                                this.setSearchCondition(qb, item, '$and');
                            });
                        }));
                    }
                }
                else if (util_1.isArrayFull(search.$or)) {
                    if (keys.length === 1) {
                        if (search.$or.length === 1) {
                            this.setSearchCondition(builder, search.$or[0], condition);
                        }
                        else {
                            this.builderAddBrackets(builder, condition, new typeorm_1.Brackets((qb) => {
                                search.$or.forEach((item) => {
                                    this.setSearchCondition(qb, item, '$or');
                                });
                            }));
                        }
                    }
                    else {
                        this.builderAddBrackets(builder, condition, new typeorm_1.Brackets((qb) => {
                            keys.forEach((field) => {
                                if (field !== '$or') {
                                    const value = search[field];
                                    if (!util_1.isObject(value)) {
                                        this.builderSetWhere(qb, '$and', field, value);
                                    }
                                    else {
                                        this.setSearchFieldObjectCondition(qb, '$and', field, value);
                                    }
                                }
                                else {
                                    if (search.$or.length === 1) {
                                        this.setSearchCondition(builder, search.$or[0], '$and');
                                    }
                                    else {
                                        this.builderAddBrackets(qb, '$and', new typeorm_1.Brackets((qb2) => {
                                            search.$or.forEach((item) => {
                                                this.setSearchCondition(qb2, item, '$or');
                                            });
                                        }));
                                    }
                                }
                            });
                        }));
                    }
                }
                else {
                    if (keys.length === 1) {
                        const field = keys[0];
                        const value = search[field];
                        if (!util_1.isObject(value)) {
                            this.builderSetWhere(builder, condition, field, value);
                        }
                        else {
                            this.setSearchFieldObjectCondition(builder, condition, field, value);
                        }
                    }
                    else {
                        this.builderAddBrackets(builder, condition, new typeorm_1.Brackets((qb) => {
                            keys.forEach((field) => {
                                const value = search[field];
                                if (!util_1.isObject(value)) {
                                    this.builderSetWhere(qb, '$and', field, value);
                                }
                                else {
                                    this.setSearchFieldObjectCondition(qb, '$and', field, value);
                                }
                            });
                        }));
                    }
                }
            }
        }
    }
    builderAddBrackets(builder, condition, brackets) {
        if (condition === '$and') {
            builder.andWhere(brackets);
        }
        else {
            builder.orWhere(brackets);
        }
    }
    builderSetWhere(builder, condition, field, value, operator = '$eq') {
        const time = process.hrtime();
        const index = `${field}${time[0]}${time[1]}`;
        const args = [
            { field, operator: util_1.isNull(value) ? '$isnull' : operator, value },
            index,
            builder,
        ];
        const fn = condition === '$and' ? this.setAndWhere : this.setOrWhere;
        fn.apply(this, args);
    }
    setSearchFieldObjectCondition(builder, condition, field, object) {
        if (util_1.isObject(object)) {
            const operators = util_1.objKeys(object);
            if (operators.length === 1) {
                const operator = operators[0];
                const value = object[operator];
                if (util_1.isObject(object.$or)) {
                    const orKeys = util_1.objKeys(object.$or);
                    this.setSearchFieldObjectCondition(builder, orKeys.length === 1 ? condition : '$or', field, object.$or);
                }
                else {
                    this.builderSetWhere(builder, condition, field, value, operator);
                }
            }
            else {
                if (operators.length > 1) {
                    this.builderAddBrackets(builder, condition, new typeorm_1.Brackets((qb) => {
                        operators.forEach((operator) => {
                            const value = object[operator];
                            if (operator !== '$or') {
                                this.builderSetWhere(qb, condition, field, value, operator);
                            }
                            else {
                                const orKeys = util_1.objKeys(object.$or);
                                if (orKeys.length === 1) {
                                    this.setSearchFieldObjectCondition(qb, condition, field, object.$or);
                                }
                                else {
                                    this.builderAddBrackets(qb, condition, new typeorm_1.Brackets((qb2) => {
                                        this.setSearchFieldObjectCondition(qb2, '$or', field, object.$or);
                                    }));
                                }
                            }
                        });
                    }));
                }
            }
        }
    }
    getSelect(query, options) {
        const allowed = this.getAllowedColumns(this.entityColumns, options);
        const columns = query.fields && query.fields.length
            ? query.fields.filter((field) => allowed.some((col) => field === col))
            : allowed;
        const select = [
            ...(options.persist && options.persist.length ? options.persist : []),
            ...columns,
            ...this.entityPrimaryColumns,
        ].map((col) => `${this.alias}.${col}`);
        return select;
    }
    getSkip(query, take) {
        return query.page && take
            ? take * (query.page - 1)
            : query.offset
                ? query.offset
                : null;
    }
    getTake(query, options) {
        if (query.limit) {
            return options.maxLimit
                ? query.limit <= options.maxLimit
                    ? query.limit
                    : options.maxLimit
                : query.limit;
        }
        if (options.limit) {
            return options.maxLimit
                ? options.limit <= options.maxLimit
                    ? options.limit
                    : options.maxLimit
                : options.limit;
        }
        return options.maxLimit ? options.maxLimit : null;
    }
    getSort(query, options) {
        return query.sort && query.sort.length
            ? this.mapSort(query.sort)
            : options.sort && options.sort.length
                ? this.mapSort(options.sort)
                : {};
    }
    getFieldWithAlias(field) {
        const cols = field.split('.');
        switch (cols.length) {
            case 1:
                return `${this.alias}.${field}`;
            case 2:
                return field;
            default:
                return cols.slice(cols.length - 2, cols.length).join('.');
        }
    }
    mapSort(sort) {
        const params = {};
        for (let i = 0; i < sort.length; i++) {
            params[this.getFieldWithAlias(sort[i].field)] = sort[i].order;
        }
        return params;
    }
    mapOperatorsToQuery(cond, param) {
        const field = this.getFieldWithAlias(cond.field);
        let str;
        let params;
        if (cond.operator[0] !== '$') {
            cond.operator = ('$' + cond.operator);
        }
        switch (cond.operator) {
            case '$eq':
                str = `${field} = :${param}`;
                break;
            case '$ne':
                str = `${field} != :${param}`;
                break;
            case '$gt':
                str = `${field} > :${param}`;
                break;
            case '$lt':
                str = `${field} < :${param}`;
                break;
            case '$gte':
                str = `${field} >= :${param}`;
                break;
            case '$lte':
                str = `${field} <= :${param}`;
                break;
            case '$starts':
                str = `${field} LIKE :${param}`;
                params = { [param]: `${cond.value}%` };
                break;
            case '$ends':
                str = `${field} LIKE :${param}`;
                params = { [param]: `%${cond.value}` };
                break;
            case '$cont':
                str = `${field} LIKE :${param}`;
                params = { [param]: `%${cond.value}%` };
                break;
            case '$excl':
                str = `${field} NOT LIKE :${param}`;
                params = { [param]: `%${cond.value}%` };
                break;
            case '$in':
                if (!Array.isArray(cond.value) || !cond.value.length) {
                    this.throwBadRequestException(`Invalid column '${cond.field}' value`);
                }
                str = `${field} IN (:...${param})`;
                break;
            case '$notin':
                if (!Array.isArray(cond.value) || !cond.value.length) {
                    this.throwBadRequestException(`Invalid column '${cond.field}' value`);
                }
                str = `${field} NOT IN (:...${param})`;
                break;
            case '$isnull':
                str = `${field} IS NULL`;
                params = {};
                break;
            case '$notnull':
                str = `${field} IS NOT NULL`;
                params = {};
                break;
            case '$between':
                if (!Array.isArray(cond.value) || !cond.value.length || cond.value.length !== 2) {
                    this.throwBadRequestException(`Invalid column '${cond.field}' value`);
                }
                str = `${field} BETWEEN :${param}0 AND :${param}1`;
                params = {
                    [`${param}0`]: cond.value[0],
                    [`${param}1`]: cond.value[1],
                };
                break;
            default:
                str = `${field} = :${param}`;
                break;
        }
        if (typeof params === 'undefined') {
            params = { [param]: cond.value };
        }
        return { str, params };
    }
}
exports.TypeOrmCrudService = TypeOrmCrudService;
//# sourceMappingURL=typeorm-crud.service.js.map