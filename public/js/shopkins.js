$('#newShopkin').click(function(event){
	$('#name').val('');
	$('#number').val('');
	$('#season').val('1');
	$('#rarity').val('Common');
	$('#edit-shopkin').data('id', '');
	$('#edit-shopkin').modal('show');

	console.log($('#edit-shopkin').data('id'));
});


$('#saveShopkin').click(function(event){

	var data = {};
	data['name'] = $('#name').val();
	data['number'] = $('#number').val();
	data['season'] = $('#season').val();
	data['rarity'] = $('#rarity').val();

	if($('#edit-shopkin').data('id')){
	  data['id'] = $('#edit-shopkin').data('id');
	}

	console.log(data);

	$.ajax('/admin/save/shopkin', {
		data: data,
		method: 'POST',
		success: function(data, status, xhr) {
			
			console.log('closing dialog');

			$('#edit-shopkin').modal('hide');
			$('#name').val('');
			$('#number').val('');
			$('#season').val('1');
			$('#rarity').val('Common');
			$('#edit-shopkin').data('id', undefined);
		},

		error: function(xhr, status, error) {
			console.log(error);
			$('#edit-shopkin').modal('hide');
		}
	});
	event.preventDefault();
});

$('.shopkinlink').click(function(event){

	console.log('link clicked');

	var link = $(this);
	$('#name').val(link.data('name'));
	$('#number').val(link.data('number'));
	$('#season').val(link.data('season'));
	$('#rarity').val(link.data('rarity'));
	$('#edit-shopkin').data('id', link.data('id'));	
	
	console.log('showing modal');
	$('#edit-shopkin').modal('show');

	event.preventDefault();

});


$('.add-collection').click(function(event){

	var shopkinid = $(this).data('shopkin');
	var counter = $(this).parent().parent().find('.count');

	console.log(shopkinid);

	$.ajax('/add/'+shopkinid, {
		method: 'POST',
		success: function(data, status, xhr) {
			var collection = JSON.parse(data);

			console.log('collection count: '+collection.count);

			counter.text(collection.count);
		}
	})

	event.preventDefault(); 
});


$('.delete').click(function(event){

	var shopkinid = $(this).data('id');
	console.log(shopkinid);

	$.ajax('/admin/remove/shopkin/'+shopkinid, {
		method: 'POST',
		success: function(response, status, xhr){
			
			if(response.error) {
				console.log(response.error);
			} else {
				console.log('removeing shopkin '+shopkinid);
				$('#shopkin_'+shopkinid).remove();
			}	
		}

	});

	event.preventDefault();

});