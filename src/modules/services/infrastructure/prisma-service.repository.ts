import {Injectable} from '@nestjs/common';
import {
    FindByServiceFilters,
    FindOneServiceFilters,
    ServiceData,
    ServiceRepository
} from "../domain/service.repository";
import {PrismaService} from "../../../infrastructure/prisma/prisma.service";
import {Service} from "../domain/service.entity";

@Injectable()
export class PrismaServiceRepository implements ServiceRepository {
    constructor(private readonly prisma: PrismaService) {
    }

    async findBy(filters: FindByServiceFilters,): Promise<Service[]> {
        const records =
            await this.prisma.service.findMany({
                where: filters,
            });

        return records.map((record) =>
            this.toEntity(record as Service),
        );
    }

    async findOne(filter: FindOneServiceFilters,): Promise<Service | null> {
        const record =
            await this.prisma.service.findFirst({
                where: filter,
            });

        return record
            ? this.toEntity(record as Service)
            : null;
    }

    async create(data: ServiceData): Promise<Service> {
        const record = await this.prisma.service.create({data}) as Service;

        return this.toEntity(record);
    }

    private toEntity(record: Service): Service {
        return record;
    }
}
