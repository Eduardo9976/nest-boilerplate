import {Module} from '@nestjs/common';
import {CreateServiceUseCase} from "./use-cases/create-service.use-case";
import {SERVICE_REPOSITORY} from "./domain/service.repository";
import {PrismaServiceRepository} from "./infrastructure/prisma-service.repository";
import {ServicesController} from "./presentation/services.controller";
import {FindOneServiceUseCase} from "./use-cases/find-one-service.use-case";
import {FindServiceByUseCase} from "./use-cases/find-service-by.use-case";
import {CategoriesModule} from "../categories/categories.module";

@Module({
    imports: [CategoriesModule],
    controllers: [ServicesController],
    providers: [
        FindOneServiceUseCase,
        FindServiceByUseCase,
        CreateServiceUseCase,
        {provide: SERVICE_REPOSITORY, useClass: PrismaServiceRepository},
    ],
    exports: [
        CreateServiceUseCase,
        FindOneServiceUseCase,
        FindServiceByUseCase,
    ],
})
export class ServicesModule {
}
