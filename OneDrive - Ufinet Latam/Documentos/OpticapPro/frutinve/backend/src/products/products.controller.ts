import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { Actor } from "../common/actor.decorator";
import { CreateProductDto, UpdateProductDto } from "./products.dto";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  list(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    return this.productsService.list(
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined
    );
  }

  @Post()
  async create(@Body() body: CreateProductDto, @Actor() actor: string) {
    const result = await this.productsService.create(body);
    await this.auditService.log(actor, "create", "product", result.id, result);
    return result;
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
    @Actor() actor: string
  ) {
    return this.productsService.update(id, body).then(async (result) => {
      await this.auditService.log(actor, "update", "product", id, body);
      return result;
    });
  }
}
