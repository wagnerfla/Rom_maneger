// server/routes/romRoutes.js
const router        = require('express').Router();
const romController = require('../controllers/romController');

router.get   ('/stats',         romController.estatisticas);
router.get   ('/verificar',     romController.verificar);
router.post  ('/escanear',      romController.escanear);
router.get   ('/',              romController.listarRoms);
router.delete('/:id',           romController.deletar);
router.post  ('/:id/metadados', romController.atualizarMetadados);
router.patch ('/:id/capa',      romController.atualizarCapa);


module.exports = router; 