const {createHandler}=require('../src/http.cjs'),{fromEnvironment}=require('../src/store.cjs');
let store;
module.exports=createHandler({getStore:()=>store||(store=fromEnvironment())});
