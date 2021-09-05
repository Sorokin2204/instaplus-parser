const { Router } = require('express');
const Category = require('../models/Category');
const router = Router();

router.get('/list', async (req,res) => {
try {
          const allCategories = await Category.find({});
            res.json({ allCategories: allCategories });
} catch (error) {
    res.status(500).json({ message: error.message });
}
})


router.post('/add', async (req, res) => {
  try {
const { nameCategory } = req.body;
if (await Category.exists({name: nameCategory})) {
       res.status(500).json({
         message: 'Категория с таким именем существует',
       });
} else {

const newCategory = new Category({ name: nameCategory });

await newCategory.save();
   res.status(201).json({
     message: 'Категория добавлена',
   });
}
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/keyword/add', async (req, res) => {
  try {
    const { nameKeyWord , idCategory } = req.body;
    
    if (
      (await Category.exists({ _id: idCategory })) 
      &&
      !(await Category.exists({
        _id: idCategory,
        keyWords:  nameKeyWord,
      }))
    ) {
      await Category.findByIdAndUpdate(idCategory, {
        $push: { keyWords: nameKeyWord },
      });
       res.status(201).json({
        message: 'Ключевое слово добавлено',
      });
    } else {
      res.status(500).json({
        message: 'Ключевое слово уже существует',
      });

    
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


router.post('/keyword/remove', async (req, res) => {
  try {
    const { removeKeyWord, idCategory } = req.body;

    if (
      (await Category.exists({ _id: idCategory })) &&
      (await Category.exists({
        _id: idCategory,
        keyWords: removeKeyWord,
      }))
    ) {
      await Category.findByIdAndUpdate(idCategory, {
        $pull: { keyWords: removeKeyWord },
      });
      res.status(201).json({
        message: 'Ключевое слово удалено',
      });
    } else {
      res.status(500).json({
        message: 'Не получилось удалить слово'
      });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});



module.exports = router;