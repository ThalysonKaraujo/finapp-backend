import { Controller, Get, Query, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('verify')
  async verifyEmail(@Query('token') token: string, @Req() req: any, @Res() res: any) {
    const success = await this.authService.verifyEmail(token, req.headers);

    if (success) {
      res.send(`
        <html>
          <head><title>Email Verificado</title></head>
          <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f9fafb;">
            <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #10b981;">E-mail verificado com sucesso!</h2>
              <p style="color: #4b5563;">Sua conta está pronta. Você pode fechar esta aba e voltar para o aplicativo.</p>
            </div>
          </body>
        </html>
      `);
    } else {
      res
        .status(400)
        .send('Erro ao verificar o e-mail ou token inválido/expirado.');
    }
  }
}
