const router = require('express').Router();
const romController = require('../controllers/romController');

router.get ('/', romController.listarRoms);
router.post ('/escanear', romController.escanear);
router.get ('/verificar', romController.verificar);
router.delete ('/:id', romController.deletar);
router.post ('/:id/metadados', romController.atualizarMetadados);
router.patch ('/:id/capa', romController.atualizarCapa);
router.get ('/stats', romController.estatisticas);

module.export = router;