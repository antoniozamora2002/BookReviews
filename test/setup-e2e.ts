// Se ejecuta ANTES de que los tests importen AppModule.
//
// @nestjs/config no pisa las variables que ya existen en process.env
// (solo rellena las que faltan), asi que definirlas aqui tiene prioridad
// sobre el .env de desarrollo sin tener que tocar AppModule.
process.env.DB_HOST = process.env.DB_HOST_TEST ?? 'localhost';
process.env.DB_PORT = process.env.DB_PORT_TEST ?? '5434';
process.env.DB_USERNAME = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_DATABASE = 'test_db';
process.env.JWT_SECRET = 'secreto-solo-para-tests-con-32-caracteres-minimo';
process.env.JWT_REFRESH_SECRET = 'otro-secreto-de-refresh-para-tests-distinto';

// Los e2e hacen decenas de peticiones seguidas; el rate limiting los cortaria.
// throttle.e2e-spec.ts lo vuelve a activar para probarlo especificamente.
process.env.THROTTLE_DISABLED = 'true';
process.env.GOOGLE_BOOKS_API_KEY = 'dummy-key';
