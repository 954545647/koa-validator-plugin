### koa-validator-plugin
a plugin for validating your parameters easily.

this plugin is base on validator.js [validator](https://www.npmjs.com/package/validator)

### Install
Install the plugin with **npm install koa-validator-plugin**
```
const validator = require('koa-validator-plugin');
```

### Why Use
when a http request mathcing one of your Routing table, for example, a register request.

this request carry some user info parameters
```
{
    "username": "rex",
    "password1": "123456",
    "password2": "123456"
}
```
assume the length of username must greater than six, the password can only be number, what's more, the length of password is between six and twelve.

```
router.post('/register',async (ctx,next)=>{
    const username = ctx.body.username;
    const password1 = ctx.body.password1;
    const password2 = ctx.body.password2;
    if(username.length < 6){
        ...
    }
    var reg = /\d+/
    if(psssword.length || 6 password.length > 12 ||  reg.test(password1)){
        ...
    }
})

// use koa-bodyparser to analysis the ctx
```
Not hard to find, we wrote a lot of logic code in our router, once the project is complex, our code will be poorly readable.

But now, you can use this plugin to help you
```
const { Rule, Validator } = require("koa-validator-plugin");

class RegisterValidator extends Validator {
  constructor() {
    super();
    this.username = [
      new Rule("isLength", "昵称最少在6位", {
        min: 6
      })
    ];
    this.password1 = [
      // 用户密码指定范围
      new Rule("isLength", "密码至少6个字符，最多12个字符", {
        min: 6,
        max: 12
      }),
      new Rule(
        "matches",
        "密码只能是数字 ",
        "^[0-9]+$"
      )
    ];
    this.password2 = this.password1;
  }

// your can design the rule as you want.
  validatePassword(values) {
    const pass1 = values.body.password1;
    const pass2 = values.body.password2;
    if (pass1 !== pass2) {
      throw new Error("两次输入的密码不一致");
    }
  }
}
```
now, recommend your custom class RegisterValidator
```
const { RegisterValidator } = require("./user");

router.post('/register',async (ctx,next)=>{
  const v = await new RegisterValidator().validate(ctx);
})
```
All the verification plugin have been completed for you.

