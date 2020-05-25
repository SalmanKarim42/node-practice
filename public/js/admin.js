const deleteProduct = (btn) => {
  const prodId = btn.parentNode.querySelector("[name=prodId]").value;
  const _csrf = btn.parentNode.querySelector("[name=_csrf]").value;
  const productElement = btn.closest('article')
  //   console.log("Clicked", id);
  fetch(`/admin/product/${prodId}`, {
    method: "DELETE",
    headers: {
      "csrf-token": _csrf,
    },
  })
    .then((result) => {
        return result.json();
    //   console.log(result);
    })
    .then((result) => {
        // return result.json();
      console.log(result);
      if(result.status ==='success'){
        productElement.parentNode.removeChild(productElement);
      } else {
        
      }
    })
    .catch((err) => {
      console.log(err);
    });
};
