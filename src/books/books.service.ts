import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BooksService {
  private readonly baseUrl = 'https://www.googleapis.com/books/v1/volumes';

  constructor(
    @InjectRepository(Book) private booksRepository: Repository<Book>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async searchBooks(query: string): Promise<any> {
    try {
      const apiKey = this.configService.get<string>('GOOGLE_BOOKS_API_KEY');
      const url = `${this.baseUrl}?q=${encodeURIComponent(query)}&key=${apiKey}`;
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch books: ${error.message}`);
    }
  }

  async create(createBookDto: CreateBookDto): Promise<Book> {
    const googleBook = await this.fetchBookById(createBookDto.googleId);

    const newBook = this.booksRepository.create({
      googleId: googleBook.id,
      title: googleBook.volumeInfo.title,
      authors: googleBook.volumeInfo.authors || [],
      publisher: googleBook.volumeInfo.publisher,
      publishedDate: googleBook.volumeInfo.publishedDate,
      description: googleBook.volumeInfo.description,
      isbn13: googleBook.volumeInfo.industryIdentifiers?.find(
        (id) => id.type === 'ISBN_13',
      )?.identifier,
      isbn10: googleBook.volumeInfo.industryIdentifiers?.find(
        (id) => id.type === 'ISBN_10',
      )?.identifier,
      language: googleBook.volumeInfo.language,
      thumbnail: googleBook.volumeInfo.imageLinks?.thumbnail,
      pageCount: googleBook.volumeInfo.pageCount,
      averageRating: googleBook.volumeInfo.averageRating,
      ratingsCount: googleBook.volumeInfo.ratingsCount,
      maturityRating: googleBook.volumeInfo.maturityRating,
      previewLink: googleBook.volumeInfo.previewLink,
      infoLink: googleBook.volumeInfo.infoLink,
      canonicalVolumeLink: googleBook.volumeInfo.canonicalVolumeLink,
      saleability: googleBook.saleInfo?.saleability,
      isEbook: googleBook.saleInfo?.isEbook,
    });

    return this.booksRepository.save(newBook);
  }

  private async fetchBookById(googleId: string) {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes/${googleId}`,
    );
    const data = await res.json();
    if (!data || data.error) {
      throw new NotFoundException('No se encontró el libro con ese ID');
    }
    return data;
  }

  findAll(): Promise<Book[]> {
    return this.booksRepository.find();
  }

  async findOne(id: number): Promise<Book | null> {
    return this.booksRepository.findOne({
      where: { id },
      relations: ['reviews'],
    });
  }

  update(id: number, updateBookDto: UpdateBookDto) {
    return `This action updates a #${id} book`;
  }

  async remove(id: number): Promise<void> {
    await this.booksRepository.delete(id);
  }
}
