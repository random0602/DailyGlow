import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  const port = process.env.PORT || 3000;
  console.log(`STARTING SERVER on PORT: ${port} and HOST: 0.0.0.0`);
  
  await app.listen(port, '0.0.0.0');
  console.log(`Application is successfully running!`);
}
bootstrap();