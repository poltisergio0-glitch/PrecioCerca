# PrecioCerca: piloto comercial y publicación

## Modelo para el piloto

La búsqueda y comparación para compradores es gratuita. Los comercios pueden publicar precios y ofertas sin cargo durante el piloto para construir cobertura en La Calera. Antes de cobrar, medir comercios activos, publicaciones actualizadas, consultas de WhatsApp y búsquedas sin resultados. Propuesta a validar: plan mensual para comercios con herramientas de promoción y métricas. Los anuncios deben llevar etiqueta «Promocionado» y no alterar el orden de «Menor precio» sin avisar al comprador. No se habilitan cobros hasta contar con una propuesta y facturación definidas.

## Estado técnico antes de Google Play

- Existe PWA en GitHub Pages, pero no Android App Bundle firmado ni ficha de Play Console.
- Existe página pública de privacidad y flujo de eliminación desde la cuenta mediante función de servidor; falta probarlo de extremo a extremo con una cuenta descartable y agregar un canal alternativo para quien perdió acceso.
- Verificar guardado de un producto y una oferta vencida con una cuenta comercial de prueba, subida de imagen, pausa y actualización en la búsqueda.
- Completar datos exactos del responsable y contacto, plazos de conservación, y declarar ubicación, correo y fotos en Data safety según el comportamiento final.
- Para Trusted Web Activity, usar dominio propio con Digital Asset Links alojado en `/.well-known/assetlinks.json` y la huella del certificado de firma; GitHub Pages en una subruta no permite poner ese archivo en la raíz del dominio compartido.
- Crear cuenta de desarrollador, generar firma/AAB, prueba interna y completar requisitos vigentes de Play Console. El alta y la publicación exigen pasos en la cuenta del titular.

## Eliminación de cuenta

El botón registra la solicitud y llama `delete-account`. La función comprueba el JWT y la solicitud del mismo usuario, limpia referencias a sus fotos, borra sus archivos mediante Storage API y elimina la cuenta con cascada a perfil, locales, precios, favoritos y listas. Si falla, la solicitud persiste para reintentar. Una cuenta sin acceso aún requiere un canal externo verificado antes de publicar en Play Store.
