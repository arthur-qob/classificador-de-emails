import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import bg_img from './assets/bg-image.jpg'
import Tooltip from '@mui/material/Tooltip'

function App() {
	const [text, setText] = useState('')
	const [result, setResult] = useState<null | string>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [loading, setLoading] = useState<boolean>(false)

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setResult('Classificando...')
		setLoading(true)

		const file = fileInputRef.current?.files?.[0]
		const textContent = text.trim()

		if (!file && !textContent) {
			alert('Por favor, insira um texto ou selecione um arquivo.')
			return
		}

		if (file) {
			console.log('Enviando arquivo:', file.name)

			const formData = new FormData()
			formData.append('file', file)

			const res = await fetch('http://127.0.0.1:5000/classificar', {
				method: 'POST',
				body: formData
			})

			const data = await res.json()
			setResult(data)
		} else {
			console.log('Enviando texto:', textContent)
			const res = await fetch('http://127.0.0.1:5000/classificar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text })
			})

			const data = await res.json()
			setResult(data)
		}

		setLoading(false)
	}

	const copyTextRef = useRef<HTMLPreElement>(null)
	const feedbackRef = useRef<HTMLSpanElement>(null)

	const handleCopy = () => {
		const copyText = copyTextRef.current?.innerText
		const feedback = feedbackRef.current

		const tempTextArea = document.createElement('textarea')
		tempTextArea.value = copyText || ''

		tempTextArea.style.position = 'fixed'
		tempTextArea.style.top = '-9999px'
		tempTextArea.style.left = '-9999px'

		document.body.appendChild(tempTextArea)
		tempTextArea.focus()
		tempTextArea.select()

		try {
			const successful = document.execCommand('copy')

			if (successful) {
				feedback?.classList.remove('opacity-0')
				feedback?.classList.add('opacity-1')

				setTimeout(() => {
					feedback?.classList.remove('opacity-1')
					feedback?.classList.add('opacity-0')
				}, 2500)
			} else {
				console.error('Falha ao copiar o texto.')
			}
		} catch (err) {
			console.error('Falha ao copiar o texto.', err)
		}

		document.body.removeChild(tempTextArea)
	}

	return (
		<div
			className={`bg-[url(${bg_img})] bg-cover bg-center h-screen flex items-center justify-center select-none`}>
			<div className='backdrop-blur-md bg-[rgba(0,0,0,0.5)] rounded-xl p-6 w-[95%] h-[95%] shadow-2xl'>
				<h1 className='text-white text-3xl font-bold text-center mb-10'>
					Classificador de E-mails
				</h1>
				<div className='flex flex-row h-full justify-between max-h-[85%]'>
					<form
						onSubmit={handleSubmit}
						className='space-y-4 w-[47.5%] h-full'>
						<div className='flex flex-col gap-2 text-white'>
							<p className='text-lg'>
								Nesta área, você pode copiar o texto do email e
								colar na área de texto abaixo ou baixar o email
								em formato .txt ou .pdf e selecioná-los na área
								de upload.
							</p>
							<p className='text-md font-bold text-red-500 underline'>
								Por favor apenas usar UMA das opções!
							</p>
						</div>
						<textarea
							className={
								'bg-transparent w-full border p-2 rounded-md h-[25%] placeholder-white shadow-lg text-white' +
								(loading
									? ' cursor-not-allowed placeholder:text-gray-400 border-gray-400'
									: '')
							}
							placeholder='Cole o texto do e-mail aqui...'
							value={text}
							disabled={loading}
							onChange={(e) => setText(e.target.value)}
						/>
						<div className='flex items-center justify-between'>
							<div className='border w-[45%]'></div>
							<p className='text-white text-center text-xl'>OU</p>
							<div className='border w-[45%]'></div>
						</div>
						<div className='flex flex-col items-center justify-between gap-5'>
							<label
								className={
									'w-full text-white text-lg border border-dashed px-10 py-10 rounded-md cursor-pointer hover:bg-gray-300 hover:text-black transition shadow-xl w-[45%] text-center' +
									(loading
										? ' cursor-not-allowed text-gray-400 border-gray-400'
										: '')
								}
								htmlFor='file-upload'>
								Clique aqui para carregar um arquivo (.txt ou
								.pdf)
							</label>
							<input
								type='file'
								name='file'
								className='file:hidden text-white border w-full py-4 px-2 rounded-md'
								id='file-upload'
								translate='yes'
								ref={fileInputRef}
								accept='.txt,.pdf'
								disabled={loading}
							/>
							<button
								type='submit'
								className={
									'w-full px-4 py-2 rounded-md shadow-xl text-lg ' +
									(loading
										? 'bg-gray-300 cursor-not-allowed'
										: 'bg-white hover:bg-gray-300')
								}
								disabled={loading}>
								{loading ? 'Processando...' : 'Processar'}
							</button>
						</div>
					</form>
					<div className='border'></div>
					<section className='space-y-4 w-[47.5%] h-full'>
						<p className='text-white text-lg'>
							Aqui, você verá a classificação do e-mail, assim
							como a resposta gerada por IA.
						</p>
						<div className='relative mt-4 bg-transparent p-4 rounded-md border overflow-auto h-full max-h-[92.5%] text-white'>
							{result !== null ? (
								typeof result === 'object' ? (
									<div className='flex flex-col gap-5'>
										<div className='flex flex-row justify-between max-w-[35%]'>
											<p className='font-bold'>
												Categoria:{' '}
											</p>
											<p>{result['category']}</p>
										</div>
										<div className='flex flex-row justify-between max-w-[35%]'>
											<p className='font-bold'>
												Precisão:{' '}
											</p>
											<p>{`${result['confidence']}`}</p>
										</div>
										<div className='flex flex-col gap-5'>
											<div className='flex flex-row justify-between mt-5'>
												<p className='font-bold'>
													Sugestão de resposta:
												</p>
												<button
													id='copy-btn'
													className='border px-2 rounded-md flex items-center justify-center'
													onClick={handleCopy}>
													Copy
												</button>
											</div>
											<pre
												ref={copyTextRef}
												className='whitespace-pre-wrap select-text border rounded-md p-2'>
												{result['suggested_response']}
											</pre>
											<span
												ref={feedbackRef}
												className='text-green-300 text-center opacity-0 transition-opacity duration-300'>
												Copiado para sua área de
												transferência
											</span>
										</div>
									</div>
								) : (
									result
								)
							) : (
								<p className='text-gray-400'>
									Nenhum resultado disponível.
								</p>
							)}
							<Tooltip
								title='Favor revisar atentamente para garantir que a resposta esteja adequada ao contexto do e-mail recebido.'
								placement='left'>
								<span className='absolute bottom-2 right-2 text-white hover:bg-gray-100 hover:text-black hover:scale-110 transition rounded-full cursor-pointer flex items-center justify-center p-2'>
									<i className='fa-regular fa-circle-question text-3xl'></i>
								</span>
							</Tooltip>
						</div>
					</section>
				</div>
			</div>
		</div>
	)
}

export default App
