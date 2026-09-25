import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard, VerifiedEmailGuard } from '@yemesek/auth';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { ListRestaurantsQuery } from './dto/list-restaurants.query';
import { RestaurantsService } from './restaurants.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Get()
  list(@Query() query: ListRestaurantsQuery) {
    return this.restaurants.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.restaurants.detail(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  create(@Body() dto: CreateRestaurantDto, @CurrentUser() user: AuthUser) {
    return this.restaurants.create(dto, user.id);
  }
}
