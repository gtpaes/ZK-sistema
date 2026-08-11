/**
 * controllers/crudController.js — Fábrica de controllers CRUD genéricos
 *
 * Gera handlers padronizados para qualquer model Mongoose.
 * Reduz duplicação de código entre os controllers de módulos simples.
 */

const criarCRUD = (Model) => ({
  /** GET / — lista todos os registros */
  async listar(req, res, next) {
    try {
      const registros = await Model.find().lean();
      res.json({ success: true, data: registros });
    } catch (err) {
      next(err);
    }
  },

  /** GET /:id — busca por id customizado ou _id */
  async buscar(req, res, next) {
    try {
      const { id } = req.params;
      const registro = await Model.findOne({ id }).lean();
      if (!registro) {
        return res.status(404).json({ success: false, message: "Registro não encontrado" });
      }
      res.json({ success: true, data: registro });
    } catch (err) {
      next(err);
    }
  },

  /** POST / — cria registro */
  async criar(req, res, next) {
    try {
      const dados = req.body;

      // Se o frontend não enviou id, gera automaticamente (compatível com DB.uid())
      if (!dados.id) delete dados.id;

      const registro = await Model.create(dados);
      res.status(201).json({ success: true, data: registro });
    } catch (err) {
      next(err);
    }
  },

  /** PUT /:id — atualiza registro */
  async atualizar(req, res, next) {
    try {
      const { id } = req.params;
      const dados = { ...req.body, atualizadoEm: new Date().toISOString() };

      const registro = await Model.findOneAndUpdate({ id }, dados, {
        new: true,
        runValidators: true,
      });

      if (!registro) {
        return res.status(404).json({ success: false, message: "Registro não encontrado" });
      }
      res.json({ success: true, data: registro });
    } catch (err) {
      next(err);
    }
  },

  /** DELETE /:id — remove registro */
  async remover(req, res, next) {
    try {
      const { id } = req.params;
      const registro = await Model.findOneAndDelete({ id });

      if (!registro) {
        return res.status(404).json({ success: false, message: "Registro não encontrado" });
      }
      res.json({ success: true, message: "Registro excluído com sucesso" });
    } catch (err) {
      next(err);
    }
  },
});

module.exports = criarCRUD;