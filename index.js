const validator = require("validator");
const { get, last, set, cloneDeep } = require("lodash");
const { findFields } = require("./util");

class Validator {
  constructor() {
    this.data = {};
    this.parsed = {};
  }

  _getAllParams(ctx) {
    return {
      body: ctx.request.body,
      query: ctx.request.query,
      header: ctx.request.header,
      path: ctx.params
    };
  }

  get(path, parsed = true) {
    if (parsed) {
      const value = get(this.parsed, path, null);
      if (value == null) {
        const keys = path.split(".");
        const key = last(keys);
        return get(this.parsed.default, key);
      }
      return value;
    } else {
      return get(this.data, path);
    }
  }

  _findAllValidatorField(key) {
    var reg = /^(validate)[A-Z]\w?/;
    if (reg.test(key)) {
      return true;
    }
    if (this[key] instanceof Array) {
      this[key].forEach(item => {
        const isRuleType = item instanceof Rule;
        if (!isRuleType) {
          throw new Error("验证数组必须全部为Rule类型");
        }
      });
      return true;
    }
    return false;
  }

  async validate(ctx) {
    let params = this._getAllParams(ctx);
    this.data = cloneDeep(params);
    this.parsed = cloneDeep(params);
    const fieldKeys = findFields(this, this._findAllValidatorField.bind(this));
    const errorMsgs = [];
    for (let key of fieldKeys) {
      const result = await this._check(key);
      if (!result.success) {
        errorMsgs.push(result.msg);
      }
    }
    if (errorMsgs.length != 0) {
      throw new Error(errorMsgs);
    }
    ctx.v = this;
    return this;
  }

  async _check(key) {
    const isCustomFun = typeof this[key] === "function" ? true : false;
    let result;
    if (isCustomFun) {
      try {
        await this[key](this.data);
        result = new RuleResult(true);
      } catch (error) {
        result = new RuleResult(
          false,
          error.msg || error.message || "参数错误"
        );
      }
    } else {
      const rules = this[key];
      const ruleField = new RuleField(rules);
      const param = this._getParam(key);
      result = ruleField.validate(param.value);
      if (result.pass) {
        if (param.path.length == 0) {
          set(this.parsed, ["default", key], result.legalValue);
        } else {
          set(this.parsed, param.path, result.legalValue);
        }
      }
    }

    if (!result.pass) {
      const msg = `${isCustomFun ? "" : key}${result.msg}`;
      return {
        msg: msg,
        success: false
      };
    }
    return {
      msg: "ok",
      success: true
    };
  }

  _getParam(key) {
    let value;
    value = get(this.data, ["query", key]);
    if (value) {
      return {
        value,
        path: ["query", key]
      };
    }
    value = get(this.data, ["body", key]);
    if (value) {
      return {
        value,
        path: ["body", key]
      };
    }
    value = get(this.data, ["path", key]);
    if (value) {
      return {
        value,
        path: ["path", key]
      };
    }
    value = get(this.data, ["header", key]);
    if (value) {
      return {
        value,
        path: ["header", key]
      };
    }
    return {
      value: null,
      path: []
    };
  }
}

class Rule {
  constructor(name, msg, ...params) {
    this.name = name;
    this.msg = msg;
    this.params = params;
  }

  validate(field) {
    if (this.name === "isOptional") return RuleResult(true);
    if (!validator[this.name](field + "", ...this.params)) {
      return new RuleResult(false, this.msg || this.message || "参数错误");
    }
    return new RuleResult(true, "");
  }
}

class RuleResult {
  constructor(pass, msg = "") {
    this.pass = pass;
    this.msg = msg;
  }
}

class RuleFieldResult extends RuleResult {
  constructor(pass, msg = "", legalValue = null) {
    super(pass, msg);
    this.legalValue = legalValue;
  }
}

class RuleField {
  constructor(rules) {
    this.rules = rules;
  }
  validate(value) {
    if (value === null) {
      const allowEmpty = this._allowEmpty();
      const defaultValue = this._hasDefault();
      if (allowEmpty) {
        return new RuleFieldResult(true, "", defaultValue);
      } else {
        return new RuleFieldResult(false, "字段是必填的");
      }
    }
    const filedResult = new RuleFieldResult(false);
    for (let rule of this.rules) {
      let result = rule.validate(value);
      if (!result.pass) {
        filedResult.msg = result.msg;
        filedResult.legalValue = null;
        return filedResult;
      }
    }

    return new RuleFieldResult(true, "", this._convert(value));
  }

  _convert(value) {
    for (let rule of this.rules) {
      if (rule.name == "isInt") {
        return parseInt(value);
      }
      if (rule.name == "isFloat") {
        return parseFloat(value);
      }
      if (rule.name == "isBoolean") {
        return value ? true : false;
      }
    }
    return value;
  }

  _allowEmpty() {
    for (let rule in this.rules) {
      if (rule.name === "isOptional") {
        return true;
      }
    }
    return false;
  }

  _hasDefault() {
    for (let rule of this.rules) {
      const defaultValue = rule.params[0];
      if (rule.name === "isOptional") {
        return defaultValue;
      }
    }
  }
}

module.exports = {
  Validator,
  Rule
};
