import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUser,
} from 'src/auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reviewsService.create(createReviewDto, user.userId);
  }

  @Get()
  findAll() {
    return this.reviewsService.findAll();
  }

  // ParseIntPipe: con el +id anterior, /reviews/abc producia NaN y la query
  // reventaba con un 500 en vez de responder 400
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reviewsService.update(id, updateReviewDto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.reviewsService.remove(id, user.userId);
  }
}
