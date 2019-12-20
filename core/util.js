const findFields = function(instance, filter) {
  function _find(instance) {
    // 结束递归
    if (instance.__proto__ === null) return [];
    let fields = Reflect.ownKeys(instance);
    // 校验每个键，必须符合以下规则之一
    // 1. 是Rule类型，数组
    // 2. 是自定义规则
    fields = fields.filter(item => {
      return filter(item);
    });
    // 递归
    return [...fields, ..._find(instance.__proto__)];
  }

  return _find(instance);
};

module.exports = {
  findFields
};
